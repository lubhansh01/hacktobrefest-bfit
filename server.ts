import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Email Transporter (Lazy Initializer)
  let transporter: nodemailer.Transporter | null = null;

  function getTransporter() {
    if (!transporter) {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const port = parseInt(process.env.SMTP_PORT || "587");

      if (!host || !user || !pass) {
        throw new Error("SMTP configuration is incomplete in environment variables (HOST, USER, or PASS missing).");
      }

      const isSecure = port === 465;
      
      const transporterOptions: any = {
        host,
        port,
        secure: isSecure,
        auth: { user, pass },
        connectionTimeout: 20000, // 20s
        greetingTimeout: 20000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        debug: true,
        logger: true
      };
      
      console.log(`[SMTP] Initializing Node: ${host}:${port} (Secure: ${isSecure}) for User: ${user}`);
      transporter = nodemailer.createTransport(transporterOptions);
    }
    return transporter;
  }

  const getFromAddress = () => {
    const name = process.env.SMTP_FROM_NAME || "Hacktoberfest Dehradun 2026";
    // Many SMTP providers (like Gmail/Outlook) REQUIRE the 'from' email to match the 'auth.user'
    const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER; 
    return `"${name}" <${email}>`;
  };

  const getBaseUrl = (req: any) => {
    const referer = req.get("referer") || req.get("origin");
    if (referer) {
      try {
        const url = new URL(referer);
        return url.origin;
      } catch (e) {
        // Ignored
      }
    }
    const host = req.get("host");
    if (host) {
      const protocol = req.secure || req.get("x-forwarded-proto") === "https" ? "https" : "http";
      return `${protocol}://${host}`;
    }
    return process.env.APP_URL || "";
  };

  // Global state for diagnostic session
  const mailLogs: any[] = [];
  const maxLogs = 50;

  function logMailEvent(event: any) {
    mailLogs.unshift({
      ...event,
      timestamp: new Date().toISOString()
    });
    if (mailLogs.length > maxLogs) mailLogs.pop();
  }

  /**
   * Hardened Email Dispatcher with Retry Logic
   */
  async function sendEmail(options: { to: string; subject: string; html: string; category?: string }, retries = 1) {
    const activeTransporter = getTransporter();
    const mailOptions = {
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      headers: {
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(2)}@${(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'localhost').split('@')[1] || 'localhost'}>`,
        'X-Entity-Ref-ID': Date.now().toString(),
        'X-Category': options.category || 'transactional'
      }
    };

    try {
      console.log(`[Email] Dispatching to ${options.to} (Subject: ${options.subject})`);
      const info = await activeTransporter.sendMail(mailOptions);
      console.log(`[Email] Transmission successful for ${options.to}. Response: ${info.response}`);
      logMailEvent({ 
        to: options.to, 
        subject: options.subject, 
        category: options.category, 
        success: true, 
        messageId: info.messageId,
        response: info.response
      });
      return { success: true, messageId: info.messageId, response: info.response };
    } catch (error: any) {
      console.error(`[Email] Transmission FAILED to ${options.to} (Retry Left: ${retries}):`, error.message);
      
      logMailEvent({ 
        to: options.to, 
        subject: options.subject, 
        category: options.category, 
        success: false, 
        error: error.message,
        code: error.code 
      });

      // Auto-retry once for common network transient errors
      if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('greeting'))) {
        console.log(`[Email] Attempting retry for ${options.to}...`);
        transporter = null; // Force fresh transporter on next getTransporter() call
        return sendEmail(options, retries - 1);
      }

      // If we get an error, we might want to clear the transporter to force a re-connect next time
      if (error instanceof Error && (error.message.includes('ECONN') || error.message.includes('ETIMEDOUT'))) {
         transporter = null;
      }
      throw error;
    }
  }

  // SMTP Mail Logs Endpoint
  app.get("/api/mail-logs", (req, res) => {
    res.json(mailLogs);
  });

  // Verify SMTP Connection
  app.get("/api/verify-smtp", async (req, res) => {
    try {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const port = process.env.SMTP_PORT;
      const from = process.env.SMTP_FROM_EMAIL;

      const config = {
        host: host ? `${host} (Found)` : 'MISSING',
        user: user ? `${user.substring(0, 3)}... (Found)` : 'MISSING',
        pass: pass ? '******** (Found)' : 'MISSING',
        port: port || '587 (default)',
        from: from || 'NOT SET (using user)',
      };

      console.log("[SMTP Doctor] Testing connectivity...");
      const activeTransporter = getTransporter();
      
      // Perform verification
      await activeTransporter.verify();
      console.log("[SMTP Doctor] Connection handshake successful.");
      
      res.json({ 
        success: true, 
        message: "SMTP Connection Verified and Ready.",
        config
      });
    } catch (error: any) {
      console.error("[SMTP Doctor] Failure:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "SMTP Connection Failed",
        code: error.code,
        command: error.command,
        response: error.response,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Simple Test Email Endpoint
  app.post("/api/test-email", async (req, res) => {
    const { to } = req.body;
    try {
      console.log(`[SMTP Test] Sending high-fidelity diagnostic to ${to}...`);
      const result = await sendEmail({
        to,
        subject: "PROTOCOL TEST: Hacktoberfest Dehradun Node Online",
        category: "test",
        html: `
          <div style="background-color: #050505; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
            </div>
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #3b82f6; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #000000 100%);">
                   <div style="color: #3b82f6; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Diagnostic Status: OK</div>
                   <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">SMTP NODE <span style="color: #3b82f6;">ONLINE</span></h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; color: #ffffff;">
                  <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello Operator,</p>
                  <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">This is a high-fidelity diagnostic signal from the <strong>Hacktoberfest Dehradun 2026</strong> production server.</p>
                  
                  <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(59, 130, 246, 0.2);">
                    <div style="color: #3b82f6; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Node Metadata</div>
                    <table style="width: 100%; color: #ffffff;">
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.4);">TIMESTAMP</td>
                        <td style="padding-bottom: 8px; font-size: 14px; font-weight: bold; text-align: right; color: #3b82f6;">${new Date().toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.4);">SOURCE ORIGIN</td>
                        <td style="padding-bottom: 8px; font-size: 14px; font-weight: bold; text-align: right;">${getFromAddress().split('<')[0]}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin-top: 30px;">
                    If you can read this message with proper formatting, your SMTP infrastructure is fully operational and protocol-compliant.
                  </p>

                  <div style="margin-top: 35px; text-align: center;">
                    <div style="display: inline-block; padding: 12px 24px; border: 1px solid #3b82f6; color: #3b82f6; border-radius: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Transmission Integrity Verified</div>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `
      });
      res.json(result);
    } catch (error: any) {
      console.error("[SMTP Test] Failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API Routes
  app.post("/api/send-confirmation", async (req, res) => {
    const { email, name, teamName } = req.body;
    const cleanEmail = String(email).trim().toLowerCase();

    try {
      const result = await sendEmail({
        to: cleanEmail,
        subject: "Hacktoberfest Dehradun 2026 - Registration Confirmed!",
        category: "registration",
        html: `
          <div style="background-color: #050505; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
            </div>
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                   <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Deployment Logged</div>
                   <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">REGISTRATION <span style="color: #22c55e;">SUCCESSFUL</span></h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; color: #ffffff;">
                  <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                  <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Welcome to the next level of innovation. Your application for <strong>Hacktoberfest Dehradun 2026</strong> has been officially logged in our system.</p>
                  
                  <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Team Deployment Details</div>
                    <table style="width: 100%; color: #ffffff;">
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.4);">TEAM NAME</td>
                        <td style="padding-bottom: 8px; font-size: 15px; font-weight: bold; text-align: right; color: #22c55e;">${teamName || "Solo Participant"}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.4);">EVENT DURATION</td>
                        <td style="padding-bottom: 8px; font-size: 15px; font-weight: bold; text-align: right;">24+ HOURS</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: rgba(255,255,255,0.4);">LOCATION</td>
                        <td style="font-size: 15px; font-weight: bold; text-align: right;">DEHRADUN, IN (HYBRID)</td>
                      </tr>
                    </table>
                  </div>

                  <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin-top: 30px;">
                    We are currently screening all high-octane applications. Stay tuned for track-specific briefings and challenge updates via the Command Center.
                  </p>

                  <div style="margin-top: 35px; text-align: center;">
                    <a href="${getBaseUrl(req)}" style="display: inline-block; padding: 16px 36px; background-color: #22c55e; color: #ffffff; text-decoration: none; border-radius: 14px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(34,197,94, 0.4);">Access Command Center</a>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `,
      });
      res.json({ success: true, messageId: result.messageId, response: result.response });
    } catch (error) {
      console.error("Confirmation Email error:", error);
      res.status(500).json({ success: false, error: "SMTP failure during registration confirmation." });
    }
  });

  // Project Progress Submission Confirmation
  app.post("/api/send-submission-confirmation", async (req, res) => {
    const { email, teamName, roundName, timestamp } = req.body;
    const cleanEmail = String(email).trim().toLowerCase();

    try {
      const result = await sendEmail({
        to: cleanEmail,
        subject: `CONFIRMED: Progressive Log Synced - "${teamName}"`,
        category: "submission",
        html: `
          <div style="background-color: #050505; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
            </div>
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                   <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Transmission Confirmed</div>
                   <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">LOG <span style="color: #22c55e;">SYNCED</span></h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; color: #ffffff;">
                  <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello Command,</p>
                  <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Your technical progress for squad <strong>"${teamName}"</strong> has been successfully synced with the Hacktoberfest Dehradun grid.</p>
                  
                  <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Submission Metadata</div>
                    <table style="width: 100%; color: #ffffff;">
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.4);">PHASE</td>
                        <td style="padding-bottom: 8px; font-size: 15px; font-weight: bold; text-align: right; color: #22c55e;">${roundName}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.4);">SOURCE TEAM</td>
                        <td style="padding-bottom: 8px; font-size: 15px; font-weight: bold; text-align: right;">${teamName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: rgba(255,255,255,0.4);">RECEPTION TIME</td>
                        <td style="font-size: 15px; font-weight: bold; text-align: right;">${timestamp}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin-top: 30px;">
                    Our strategic mentors will now analyze your transmission. Maintain operational readiness for the next deployment phase.
                  </p>

                  <div style="margin-top: 35px; text-align: center;">
                    <a href="${getBaseUrl(req)}" style="display: inline-block; padding: 16px 36px; background-color: #22c55e; color: #000000; text-decoration: none; border-radius: 14px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(34, 197, 94, 0.4);">Monitor Status</a>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `,
      });
      res.json({ success: true, messageId: result.messageId, response: result.response });
    } catch (error) {
      console.error("Submission Confirmation error:", error);
      res.status(500).json({ success: false, error: "SMTP failure during submission confirmation." });
    }
  });

  // Member Notification Route
  app.post("/api/send-member-notifications", async (req, res) => {
    const { leaderName, teamName, members } = req.body;
    try {
      const results = [];
      for (const member of members) {
        if (!member.email) continue;
        try {
          const sendResult = await sendEmail({
            to: member.email,
            subject: `${leaderName} added you to a team for Hacktoberfest Dehradun 2026`,
            category: "team_notification",
            html: `
              <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                </div>
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border-radius: 24px; overflow: hidden; border: 1px solid #222; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                       <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Team Deployment</div>
                       <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">YOU'RE <span style="color: #22c55e;">IN THE SQUAD</span></h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; color: #ffffff;">
                      <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello <strong>${member.name}</strong>,</p>
                      <p style="font-size: 18px; color: #ffffff; line-height: 1.6;"><strong>${leaderName}</strong> just registered for <strong>Hacktoberfest Dehradun 2026</strong> and added you as a teammate for <strong>"${teamName}"</strong>.</p>
                      
                      <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Next Steps</div>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0;">
                          1. Coordinate with your leader to plan your project.<br/>
                          2. Keep an eye on your inbox for challenge briefings.<br/>
                          3. Prepare for a 24-hour sprint in Dehradun!
                        </p>
                      </div>

                      <p style="font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1.6; margin-top: 30px;">
                        We're looking forward to seeing what your team builds. 
                      </p>
                      
                      <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div style="color: #ffffff; font-size: 14px; font-weight: 900; text-transform: uppercase;">Hacktoberfest Dehradun 2026</div>
                        <div style="margin-top: 15px; font-size: 11px; color: rgba(255,255,255,0.2);">In collaboration with Build with AI & Major League Hacking</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          results.push({ email: member.email, status: "sent", messageId: sendResult.messageId });
        } catch (mailErr: any) {
          console.error(`[Member Notification] Failed for ${member.email}:`, mailErr);
          results.push({ email: member.email, status: "failed", error: mailErr.message || String(mailErr) });
        }
      }
      res.json({ success: true, results });
    } catch (error) {
      console.error("Member Notification error:", error);
      res.status(500).json({ success: false, error: "SMTP failure during member notification." });
    }
  });

  // Status Update Route (Approved/Disapproved) - Sends to ALL team members
  app.post("/api/send-status-update", async (req, res) => {
    const { emails, teamName, status } = req.body;
    const isApproved = status === 'approved';
    const subject = isApproved 
      ? `ACCEPTED: Your team "${teamName}" is in for Hacktoberfest Dehradun 2026!`
      : `UPDATE: Application Status for "${teamName}" - Hacktoberfest Dehradun 2026`;

    try {
      const results = [];
      for (const email of emails) {
        if (!email) continue;
        try {
          const sendResult = await sendEmail({
            to: email,
            subject,
            category: "status_update",
            html: `
              <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                </div>
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid ${isApproved ? '#22c55e' : '#ef4444'}; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: ${isApproved ? 'linear-gradient(135deg, #064e3b 0%, #000000 100%)' : 'linear-gradient(135deg, #450a0a 0%, #000000 100%)'};">
                       <div style="color: ${isApproved ? '#22c55e' : '#ef4444'}; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Status Deployment</div>
                       <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">
                         ${isApproved ? 'APPLICATION <span style="color: #22c55e;">ACCEPTED</span>' : 'APPLICATION <span style="color: #ef4444;">REJECTED</span>'}
                       </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; color: #ffffff;">
                      <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello Team <strong>${teamName}</strong>,</p>
                      
                      ${isApproved ? `
                        <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Congratulations! Your team <strong>"${teamName}"</strong> has been officially selected to participate in <strong>Hacktoberfest Dehradun 2026</strong>.</p>
                        
                        <div style="margin: 30px 0; padding: 25px; background-color: rgba(34, 197, 94, 0.05); border-radius: 16px; border: 1px solid rgba(34, 197, 94, 0.2);">
                          <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Dashboard Access Protocol</div>
                          <ol style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.8;">
                            <li>Visit the official portal at <strong><a href="${process.env.APP_URL || '#'}" style="color: #22c55e; text-decoration: none;">Hacktoberfest Dehradun Portal</a></strong></li>
                            <li>Log in using your registered email: <strong>${emails[0]}</strong></li>
                            <li>Navigate to the <strong>"Dashboard"</strong> tab in the exploration bar.</li>
                            <li>Use the <strong>"Submission Terminal"</strong> to log your progress for each round.</li>
                            <li>Track live evaluations, marks, and mentor notes in real-time.</li>
                          </ol>

                          <div style="margin-top: 25px; text-align: center;">
                            <a href="${getBaseUrl(req)}" style="display: inline-block; padding: 14px 30px; background-color: #22c55e; color: #000000; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Launch Dashboard Station</a>
                          </div>
                        </div>

                        <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">Get ready to build something legendary. We'll send the onboarding kit and venue details shortly to your registered contact emails.</p>
                      ` : `
                        <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Thank you for your interest in <strong>Hacktoberfest Dehradun 2026</strong>. After careful review, we regret to inform you that your team <strong>"${teamName}"</strong> was not selected for this cohort.</p>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">The selection process was extremely competitive this year. We encourage you to keep building and apply for our future events.</p>
                      `}
    
                      <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div style="color: #ffffff; font-size: 14px; font-weight: 900; text-transform: uppercase;">Hacktoberfest Dehradun 2026 Engagement Team</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          results.push({ email, status: "sent", messageId: sendResult.messageId });
        } catch (mailErr: any) {
          console.error(`[Status Update] Failed for ${email}:`, mailErr);
          results.push({ email, status: "failed", error: mailErr.message || String(mailErr) });
        }
      }
      res.json({ success: true, results });
    } catch (error) {
      console.error("Status Update Email error:", error);
      res.status(500).json({ success: false, error: "SMTP failure during status update." });
    }
  });

  // Round Activation Broadcast Route
  app.post("/api/send-round-activation", async (req, res) => {
    const { emails, roundName, description } = req.body;
    try {
      const results = [];
      for (const email of emails) {
        if (!email) continue;
        try {
          const sendResult = await sendEmail({
            to: email,
            subject: `ROUND ACTIVE: ${roundName} has started! - Hacktoberfest Dehradun 2026`,
            category: "round_activation",
            html: `
              <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                </div>
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #000000 100%);">
                       <div style="color: #000; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Phase Trigger</div>
                       <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">
                         ${roundName} <span style="color: #000;">IS NOW LIVE</span>
                       </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; color: #ffffff;">
                      <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Attention Participant,</p>
                      <p style="font-size: 16px; color: rgba(255,255,255,0.8); line-height: 1.6;">The hackathon has progressed to the next stage: <strong>${roundName}</strong>.</p>
                      
                      <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">Briefing</div>
                        <p style="font-size: 14px; color: #ffffff; line-height: 1.6; margin: 0;">${description}</p>
                      </div>

                      <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">Please check the event timeline in the app for more details and specific challenge requirements.</p>
    
                      <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div style="color: #ffffff; font-size: 14px; font-weight: 900; text-transform: uppercase;">Hacktoberfest Dehradun 2026 Control Center</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          results.push({ email, status: "sent", messageId: sendResult.messageId });
        } catch (mailErr: any) {
          console.error(`[Round Activation] Failed for ${email}:`, mailErr);
          results.push({ email, status: "failed", error: mailErr.message || String(mailErr) });
        }
      }
      res.json({ success: true, results });
    } catch (error) {
      console.error("Round Activation Email error:", error);
      res.status(500).json({ success: false, error: "SMTP activation broadcast failure." });
    }
  });

  // Event Team Appointment Protocol
  app.post("/api/notify-team-appointment", async (req, res) => {
    const { email, name, designation, company, permissions } = req.body;
    const activePermissions = permissions ? Object.entries(permissions)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key.replace('manage_', 'MANAGE ').replace('view_', 'VIEW ').replace('_', ' ').toUpperCase())
      : [];

    const permissionsHtml = activePermissions.length > 0 
      ? `<div style="margin: 25px 0; padding: 20px; background-color: rgba(34,197,94, 0.1); border-radius: 16px; border: 1px solid rgba(34,197,94, 0.3);">
          <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">Security Clearance Granted</div>
          <p style="color: #ffffff; font-size: 13px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.4;">"Lubhansh" has given you the access of these functions at the platform:</p>
          <ul style="margin: 0 0 0 20px; color: rgba(255,255,255,0.8); font-size: 12px; font-weight: bold; line-height: 1.8;">
            ${activePermissions.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>`
      : "";

    try {
      await sendEmail({
        to: email,
        subject: "Hacktoberfest Dehradun 2026 - Event Team appointment Protocol",
        category: "admin_appointment",
        html: `
          <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
            </div>
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                   <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Security Clearance</div>
                   <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">TEAM <span style="color: #22c55e;">APPOINTED</span></h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; color: #ffffff;">
                   <div style="margin-bottom: 30px; padding: 20px; background-color: rgba(34,197,94, 0.05); border-radius: 16px; border: 1px solid rgba(34,197,94, 0.2); text-align: center;">
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">${name}</div>
                    <div style="font-size: 12px; font-weight: bold; color: #22c55e; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">${designation || 'Specialist'} ${company ? `@ ${company}` : ''}</div>
                  </div>

                  <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                  <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">You have been officially invited as a core member of the <strong>Event Team</strong> for <strong>Hacktoberfest Dehradun 2026</strong>.</p>
                  
                  ${permissionsHtml}

                  <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Operational Protocol</div>
                    <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.8;">
                      <li>Visit the portal: <a href="${process.env.APP_URL || '#'}" style="color: #22c55e; text-decoration: none;">Hacktoberfest Dehradun Station</a></li>
                      <li>Login: <strong>${email}</strong></li>
                      <li>Access your <strong>"Management Panel"</strong> to use your granted functions.</li>
                    </ul>
                  </div>

                  <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">Welcome to the command center.</p>
                </td>
              </tr>
            </table>
          </div>
        `,
      });
      res.json({ success: true, message: "Team appointment notification sent." });
    } catch (error) {
      console.error("Team Notification error:", error);
      res.status(500).json({ success: false, error: "SMTP appointment failure." });
    }
  });

  // Mentor Appointment Protocol
  app.post("/api/notify-mentor-appointment", async (req, res) => {
    const { email, name, designation, company } = req.body;
    console.log(`[Mentor Protocol] Initiating induction for ${email}`);

    try {
      const result = await sendEmail({
        to: email,
        subject: "Hacktoberfest Dehradun 2026 - Mentor Induction Protocol",
        category: "appointment",
        html: `
          <div style="background-color: #050505; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
            </div>
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #3b82f6; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #000000 100%);">
                   <div style="color: #3b82f6; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Strategic Guidance</div>
                   <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">MENTOR <span style="color: #3b82f6;">INDUCTED</span></h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; color: #ffffff;">
                   <div style="margin-bottom: 30px; padding: 20px; background-color: rgba(59, 130, 246, 0.05); border-radius: 16px; border: 1px solid rgba(59, 130, 246, 0.2); text-align: center;">
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">${name}</div>
                    <div style="font-size: 12px; font-weight: bold; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">${designation || 'Honored Mentor'} ${company ? `@ ${company}` : ''}</div>
                  </div>

                  <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                  <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Congratulations! You have been officially appointed as a <strong>Mentor</strong> for <strong>Hacktoberfest Dehradun 2026</strong>. Your industry expertise will shape the future of the participants.</p>
                  
                  <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="color: #3b82f6; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Access Credentials</div>
                    <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.8;">
                      <li>Visit: <a href="${getBaseUrl(req)}" style="color: #3b82f6; text-decoration: none;">Hacktoberfest Dehradun Portal</a></li>
                      <li>Login ID: <strong>${email}</strong></li>
                      <li>Role Permissions: <strong>Full Mentor Access</strong></li>
                    </ul>
                  </div>

                  <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">Thank you for your commitment to fostering innovation.</p>

                  <div style="margin-top: 35px; text-align: center;">
                    <a href="${getBaseUrl(req)}/mentor" style="display: inline-block; padding: 16px 36px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 14px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.4);">Launch Mentor Dashboard</a>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `,
      });
      res.json({ success: true, message: "Mentor induction email deployed.", ...result });
    } catch (error: any) {
      console.error("Mentor Notification error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to send mentor induction email." });
    }
  });

  // Event Team/Team Assignment Notifications
  app.post("/api/send-assignment-notifications", async (req, res) => {
    const { mentor, team } = req.body;
    try {
      const results = [];
      // 1. Notify Team Members about their Assigned Mentor
      if (team.memberEmails && team.memberEmails.length > 0) {
        for (const email of team.memberEmails) {
          try {
            const sendResult = await sendEmail({
              to: email,
              subject: `HACKTOBERFEST DEHRADUN: Mentor Assigned for "${team.name}"`,
              category: "mentor_assignment",
              html: `
                <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                  <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                    <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                  </div>
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                         <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Squad Enhancement</div>
                         <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">STRATEGIC <span style="color: #22c55e;">SUPPORT</span></h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px; color: #ffffff;">
                        <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello Team <strong>${team.name}</strong>,</p>
                        <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">An elite <strong>Mentor</strong> has been appointed to guide and monitor your unit through <strong>Hacktoberfest Dehradun 2026</strong>.</p>
                        
                        <div style="margin: 30px 0; padding: 25px; background-color: rgba(34,197,94, 0.05); border-radius: 16px; border: 1px solid rgba(34,197,94, 0.2);">
                          <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Mentor Profile Log</div>
                          <p style="margin: 0; font-size: 20px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">${mentor.name}</p>
                          <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: bold; color: #22c55e; text-transform: uppercase; letter-spacing: 1px;">${mentor.designation || 'Specialist'} ${mentor.company ? `@ ${mentor.company}` : ''}</p>
                          <p style="margin: 15px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">Communication Node: <span style="color: #ffffff;">${mentor.email}</span></p>
                        </div>

                        <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">This mentor will evaluate your round submissions and provide operational feedback. Be prepared to present your best work.</p>
                        
                        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                          <div style="color: #ffffff; font-size: 14px; font-weight: 900; text-transform: uppercase;">Hacktoberfest Dehradun 2026 Fleet Command</div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>
              `,
            });
            results.push({ email, type: 'mentor_assigned_notified', messageId: sendResult.messageId });
          } catch (mailErr: any) {
            console.error(`[Assignment Notification] Failed for ${email}:`, mailErr);
            results.push({ email, type: 'mentor_assigned_notified_failed', error: mailErr.message || String(mailErr) });
          }
        }
      }

      // 2. Notify Mentor about their new Assignment
      const mentorResult = await sendEmail({
        to: mentor.email,
        subject: `ACTION REQUIRED: New Squadron Assigned - "${team.name}"`,
        category: "mentor_assignment",
        html: `
          <div style="background-color: #050505; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
            </div>
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #3b82f6; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                   <div style="color: #3b82f6; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Deployment Directive</div>
                   <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">SQUADRON <span style="color: #3b82f6;">ASSIGNED</span></h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; color: #ffffff;">
                  <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello <strong>${mentor.name}</strong>,</p>
                  <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">A new squad has been placed under your direct supervision for <strong>Hacktoberfest Dehradun 2026</strong>. Your mission is to evaluate, guide, and support this unit.</p>
                  
                  <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="color: #3b82f6; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Squad Information Data</div>
                    <table style="width: 100%; color: #ffffff;">
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase;">TEAM NAME</td>
                        <td style="padding-bottom: 8px; font-size: 14px; font-weight: 900; text-align: right; color: #3b82f6;">${team.name}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase;">SECTOR (TRACK)</td>
                        <td style="padding-bottom: 8px; font-size: 14px; font-weight: bold; text-align: right;">${team.trackName}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">Use the <strong>Management Panel</strong> to track their round-by-round progress logs.</p>
                  
                  <div style="margin-top: 35px; text-align: center;">
                    <a href="${getBaseUrl(req)}/mentor" style="display: inline-block; padding: 16px 36px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 14px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Open Mentor Station</a>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        `,
      });
      results.push({ email: mentor.email, type: 'mentor_notified', messageId: mentorResult.messageId, response: mentorResult.response });
      res.json({ success: true, results });
    } catch (error) {
      console.error("Assignment Notification error:", error);
      res.status(500).json({ success: false, error: "SMTP failure during assignment." });
    }
  });

  // Round Qualification/Elimination Broadcast
  app.post("/api/send-qualification-update", async (req, res) => {
    const { emails, teamName, status, roundName, marks, note } = req.body;
    const isQualified = status === 'qualified';
    const subject = isQualified 
      ? `QUALIFIED: ${teamName} has advanced to the next stage!`
      : `UPDATE: High-Stakes Evaluation for "${teamName}"`;

    try {
      const results = [];
      for (const email of emails) {
        if (!email) continue;
        try {
          const sendResult = await sendEmail({
            to: email,
            subject,
            category: "qualification_update",
            html: `
              <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                </div>
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid ${isQualified ? '#22c55e' : '#ef4444'}; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: ${isQualified ? 'linear-gradient(135deg, #064e3b 0%, #000000 100%)' : 'linear-gradient(135deg, #450a0a 0%, #000000 100%)'};">
                       <div style="color: ${isQualified ? '#22c55e' : '#ef4444'}; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Gate Evaluation</div>
                       <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">
                         ${isQualified ? 'STAGE <span style="color: #22c55e;">QUALIFIED</span>' : 'STAGE <span style="color: #ef4444;">DISQUALIFIED</span>'}
                       </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; color: #ffffff;">
                      <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello Team <strong>${teamName}</strong>,</p>
                      
                      ${isQualified ? `
                        <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Exceptional precision. Your team has successfully passed the <strong>${roundName}</strong> evaluation and is cleared for the next stage of Hacktoberfest Dehradun 2026.</p>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">The stakes are rising. Check the control center for your next objective.</p>
                      ` : `
                        <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">The standard for <strong>Hacktoberfest Dehradun 2026</strong> is set to maximum intensity. After the <strong>${roundName}</strong> review, your team <strong>"${teamName}"</strong> has been eliminated from the competition.</p>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6;">While your journey ends here, the innovation doesn't have to. We hope to see you back on the grid next year.</p>
                      `}
  
                      <div style="margin: 30px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Evaluation Results</div>
                        <table style="width: 100%; color: #ffffff;">
                          <tr>
                            <td style="padding-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.4);">ROUND</td>
                            <td style="padding-bottom: 8px; font-size: 15px; font-weight: bold; text-align: right;">${roundName}</td>
                          </tr>
                          <tr>
                            <td style="padding-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.4);">MARKS OBTAINED</td>
                            <td style="padding-bottom: 8px; font-size: 20px; font-weight: bold; text-align: right; color: ${isQualified ? '#22c55e' : '#ef4444'};">${marks}/100</td>
                          </tr>
                          <tr>
                            <td style="font-size: 13px; color: rgba(255,255,255,0.4); vertical-align: top;">MENTOR NOTE</td>
                            <td style="font-size: 14px; font-style: italic; text-align: right; color: rgba(255,255,255,0.7);">${note || 'No additional comments provided.'}</td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          results.push({ email, status: "sent", messageId: sendResult.messageId });
        } catch (mailErr: any) {
          console.error(`[Qualification Eval] Failed for ${email}:`, mailErr);
          results.push({ email, status: "failed", error: mailErr.message || String(mailErr) });
        }
      }
      res.json({ success: true, results });
    } catch (error) {
      console.error("Qualification Email error:", error);
      res.status(500).json({ success: false, error: "SMTP qualification update failure." });
    }
  });

  // Bulk Update Route (Protected or Restricted)
  app.post("/api/send-bulk-update", async (req, res) => {
    const { emails, subject, message } = req.body;
    
    // Convert newlines to BR tags for correct rendering
    const formattedMessage = message ? message.replace(/\n/g, '<br />') : "";

    try {
      const results = [];
      for (const email of emails) {
        if (!email) continue;
        try {
          const sendResult = await sendEmail({
            to: email,
            subject: subject || "Hacktoberfest Dehradun 2026 - Important Update",
            category: "bulk_broadcast",
            html: `
              <div style="background-color: #050505; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                </div>
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                      <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Incoming Signal</div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">BROADCAST <span style="color: #22c55e;">UPDATE</span></h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; color: #ffffff;">
                      <div style="color: #22c55e; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 25px; border-bottom: 1px solid rgba(34,197,94, 0.2); padding-bottom: 15px;">
                        SUBJECT: ${subject || "URGENT PROTOCOL CHANGE"}
                      </div>
                      
                      <div style="font-size: 16px; color: rgba(255,255,255,0.8); line-height: 1.8; margin-bottom: 30px;">
                        ${formattedMessage}
                      </div>

                      <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                         <div style="color: #ffffff; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Hacktoberfest Dehradun 2026 Fleet Command</div>
                         <div style="margin-top: 8px; font-size: 10px; color: rgba(255,255,255,0.2);">This is a system-wide broadcast. Action may be required.</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          results.push({ email, status: "sent", messageId: sendResult.messageId });
        } catch (mailErr: any) {
          console.error(`[Bulk Update Admin] Failed for ${email}:`, mailErr);
          results.push({ email, status: "failed", error: mailErr.message || String(mailErr) });
        }
      }
      res.json({ success: true, results });
    } catch (error) {
      console.error("Bulk Email error:", error);
      res.status(500).json({ success: false, error: "SMTP bulk broadcast failure." });
    }
  });

  // Marketing Email Route
  app.post("/api/send-marketing-email", async (req, res) => {
    const { emails } = req.body;

    try {
      const results = [];

      // Basic configuration check
      console.log(`[Marketing] Initiating blast to ${emails.length} targets.`);

      for (const email of emails) {
        if (!email) continue;

        try {
          const res = await sendEmail({
            to: email,
            subject: `SEATS FILLING FAST: Join Hacktoberfest Dehradun 2026!`,
            category: "marketing",
            html: `
              <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                </div>
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #000000 100%);">
                       <div style="color: #000; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Limited Engagement</div>
                       <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">LAST CALL FOR <span style="color: #000;">INNOVATORS</span></h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; color: #ffffff;">
                      <p style="font-size: 18px; color: #ffffff; line-height: 1.6; font-weight: bold;">Hey Visionary,</p>
                      <p style="font-size: 16px; color: rgba(255,255,255,0.8); line-height: 1.6;">
                        The grid is almost full. <strong>Hacktoberfest Dehradun 2026</strong> is trending towards a sell-out as top-tier talent from across the region locks in their slots.
                      </p>
                      
                      <div style="margin: 30px 0; padding: 25px; background-color: rgba(34,197,94, 0.1); border-radius: 16px; border: 1px dashed #22c55e;">
                        <div style="color: #22c55e; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">Operational Status</div>
                        <p style="font-size: 14px; color: #ffffff; line-height: 1.6; margin: 0;">
                          🚀 <strong>85% Capacity Reached:</strong> Slots are vanishing by the hour.<br/>
                          🛠️ <strong>3 Massive Tracks:</strong> AI, Web3, and Sustainable Tech.<br/>
                          🏆 <strong>Huge Prize Pool:</strong> Cash rewards & industry mentorship.<br/>
                          📍 <strong>Location:</strong> Dehradun, IN (Hybrid Infrastructure).
                        </p>
                      </div>

                      <p style="font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.6;">
                        This isn't just a hackathon; it's a 24-hour sprint to define the future. Whether you're a designer, developer, or strategist, your skills are needed at the frontlines.
                      </p>

                      <div style="margin-top: 40px; text-align: center;">
                        <a href="${getBaseUrl(req)}/register" style="display: inline-block; padding: 18px 40px; background-color: #22c55e; color: #000000; text-decoration: none; border-radius: 14px; font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(34,197,94, 0.3);">Secure Your Slot Now</a>
                      </div>
                      
                      <p style="margin-top: 25px; text-align: center; color: rgba(255,255,255,0.3); font-size: 12px; font-style: italic;">
                        Once the timer hits zero or seats fill, the gate closes permanently.
                      </p>

                      <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div style="color: #ffffff; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Hacktoberfest Dehradun 2026 Recruitment Fleet</div>
                        <div style="margin-top: 10px; font-size: 11px; color: rgba(255,255,255,0.2);">Powered by OptiMaxin Solutions Pvt. Ltd.</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          results.push({ email, status: "sent", messageId: res.messageId });
        } catch (mailErr) {
          console.error(`[Marketing] Failed for ${email}:`, mailErr);
          results.push({ email, status: "failed", error: mailErr instanceof Error ? mailErr.message : String(mailErr) });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Marketing Email error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to send marketing blast." });
    }
  });

  // Send QR Ticket Mail Endpoint
  app.post("/api/send-team-tickets", async (req, res) => {
    const { emails, teamId, teamName, subject, message } = req.body;
    
    try {
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ success: false, error: "Recipient emails are required" });
      }
      if (!teamId || !teamName) {
        return res.status(400).json({ success: false, error: "Team ID and Team Name are required" });
      }

      const results = [];
      const appUrl = process.env.APP_URL || getBaseUrl(req);
      const checkinUrl = `${appUrl}/checkin/${teamId}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}`;

      for (const email of emails) {
        if (!email) continue;
        const cleanEmail = String(email).trim().toLowerCase();
        
        try {
          const mailResult = await sendEmail({
            to: cleanEmail,
            subject: subject || `ENTRY PASS CONFIRMED: Team "${teamName}" - Hacktoberfest Dehradun 2026`,
            category: "qr_attendance_ticket",
            html: `
              <div style="background-color: #050505; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto 20px auto; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/12fe2UjXESdKnt-VisYbU3RTMK4W-BQi_" alt="Hacktoberfest Dehradun 2026" style="width: 100%; max-width: 600px; display: block; border-radius: 20px;">
                </div>
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #0c0c0c; border-radius: 24px; overflow: hidden; border: 1px solid #22c55e; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);">
                      <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">Admission Protocol</div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">ENTRY PASS <span style="color: #22c55e;">DIGITAL TICKET</span></h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; color: #ffffff;">
                      <p style="font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6;">Hello Team Member,</p>
                      <p style="font-size: 18px; color: #ffffff; line-height: 1.6;">Your team <strong>"${teamName}"</strong> entry pass and attendance tracking credentials have been deployed.</p>
                      
                      ${message ? `
                      <div style="margin: 20px 0; padding: 15px; border-left: 3px solid #22c55e; background-color: rgba(255, 255, 255, 0.02); font-size: 14px; line-height: 1.6; color: #ffffff;">
                        ${message.replace(/\n/g, '<br />')}
                      </div>
                      ` : ''}

                      <div style="margin: 30px 0; padding: 30px; background-color: rgba(255,255,255,0.02); border-radius: 24px; border: 1px solid rgba(34,197,94, 0.2); text-align: center;">
                        <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 20px;">Present at Gate Scanner</div>
                        
                        <!-- QR Code Image -->
                        <div style="background-color: #ffffff; padding: 16px; display: inline-block; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                          <img src="${qrCodeUrl}" alt="Check-In QR Code" style="width: 200px; height: 200px; display: block;" />
                        </div>

                        <div style="font-size: 22px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${teamName}</div>
                        <div style="font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">SQUAD VERIFICATION PROTOCOL</div>
                        <div style="font-size: 10px; font-mono: true; color: #22c55e; margin-top: 10px; letter-spacing: 1px; word-break: break-all;">ID: ${teamId}</div>
                      </div>

                      <div style="margin: 35px 0; padding: 25px; background-color: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="color: #22c55e; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">VENUE DETAILS & PROTOCOL</div>
                        <table style="width: 100%; color: #ffffff; font-size: 13px;">
                          <tr>
                            <td style="padding-bottom: 8px; color: rgba(255,255,255,0.4);">EVENT</td>
                            <td style="padding-bottom: 8px; font-weight: bold; text-align: right;">Hacktoberfest Dehradun 2026</td>
                          </tr>
                          <tr>
                            <td style="padding-bottom: 8px; color: rgba(255,255,255,0.4);">OPERATION GATE</td>
                            <td style="padding-bottom: 8px; font-weight: bold; text-align: right; color: #22c55e;">ATTENDANCE DESK</td>
                          </tr>
                          <tr>
                            <td style="color: rgba(255,255,255,0.4);">ONLINE VERIFICATION</td>
                            <td style="font-weight: bold; text-align: right;"><a href="${checkinUrl}" style="color: #22c55e; text-decoration: none;">Launch Verifier</a></td>
                          </tr>
                        </table>
                      </div>

                      <p style="font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.6; text-align: center;">
                        Please ensure each member of your team has this email or dashboard entry QR ticket ready on their mobile screen at check-in for contactless scanning.
                      </p>

                      <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <div style="color: #ffffff; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Hacktoberfest Dehradun 2026 Admin Fleet</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            `,
          });
          results.push({ email: cleanEmail, status: "sent", messageId: mailResult.messageId });
        } catch (mailErr: any) {
          console.error(`[QR Attendance Ticket] Failed for ${cleanEmail}:`, mailErr);
          results.push({ email: cleanEmail, status: "failed", error: mailErr.message || String(mailErr) });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("QR Ticket Sending error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to send QR tickets." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
