import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Html5Qrcode } from "html5-qrcode";
import { ShieldCheck, CheckCircle2, Clock, Users, Search, QrCode, Camera, Ban, Loader2, ArrowRight, Mail } from "lucide-react";
import { cn } from "../lib/utils";

export default function AttendanceManager() {
  const [teams, setTeams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scannedTeam, setScannedTeam] = useState<any | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error" | "processing">("idle");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load qualified (approved) teams in real-time
  useEffect(() => {
    const q = query(collection(db, "teams"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(data);
      setLoading(false);
    }, (error) => {
      console.error("Attendance feed connection error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle manual or scanned check-in status update
  const toggleCheckIn = async (teamId: string, currentStatus: boolean) => {
    try {
      const staffEmail = auth.currentUser?.email || "Staff Operator";
      await updateDoc(doc(db, "teams", teamId), {
        checkedIn: !currentStatus,
        checkedInAt: !currentStatus ? serverTimestamp() : null,
        checkedInBy: !currentStatus ? staffEmail : null
      });
    } catch (err) {
      console.error("Check-in permission/update blocked:", err);
    }
  };

  // Trigger automated or scanner-driven checkin
  const authorizeCheckIn = async (teamId: string) => {
    setScanStatus("processing");
    try {
      const staffEmail = auth.currentUser?.email || "Staff Operator";
      await updateDoc(doc(db, "teams", teamId), {
        checkedIn: true,
        checkedInAt: serverTimestamp(),
        checkedInBy: staffEmail
      });
      setScanStatus("success");
      // Give visual feedback for 3 seconds, then clear scan card
      setTimeout(() => {
        setScanResult(null);
        setScannedTeam(null);
        setScanStatus("idle");
      }, 3500);
    } catch (err) {
      console.error(err);
      setScanStatus("error");
    }
  };

  const sendQrEmail = async (team: any) => {
    const leadEmail = team.contactEmail || team.creatorEmail || (team.memberEmails && team.memberEmails[0]);
    if (!leadEmail) {
      setActionStatus({
        type: "error",
        message: `Failed: No contact email found for squad "${team.name}".`
      });
      return;
    }

    setSendingId(team.id);
    setActionStatus(null);

    try {
      const response = await fetch("/api/send-team-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [leadEmail],
          teamId: team.id,
          teamName: team.name,
          subject: `YOUR HACKTOBERFEST QR TICKET: Team "${team.name}"`,
          message: `Hello Team Lead,\n\nHere is your contactless check-in QR Code ticket. Please keep it handy on your device for scanning at the gate.`
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setActionStatus({
          type: "success",
          message: `Holographic QR Ticket deployed to team lead at ${leadEmail} successfully!`
        });
        setTimeout(() => setActionStatus(null), 5000);
      } else {
        throw new Error(data.error || "SMTP dispatch refused.");
      }
    } catch (error: any) {
      console.error("Failed to send QR ticket:", error);
      setActionStatus({
        type: "error",
        message: `Dispatch FAILED: ${error.message || "Unknown SMTP error. Check config."}`
      });
    } finally {
      setSendingId(null);
    }
  };

  const startScanner = () => {
    setScanning(true);
    setScanResult(null);
    setScannedTeam(null);
    setScanStatus("idle");

    // Timeout to make sure render element exists
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("qr-scanner-element");
        scanner.start(
          { facingMode: "environment" },
          { 
            fps: 15, 
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            onScanSuccess(decodedText, scanner);
          },
          onScanFailure
        ).then(() => {
          scannerRef.current = scanner;
        }).catch(err => {
          console.error("Failed to start camera scanner:", err);
          setScanning(false);
        });
      } catch (err) {
        console.error("Scanner setup block:", err);
        setScanning(false);
      }
    }, 150);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      try {
        scanner.stop().catch(err => console.error(err));
      } catch (err) {
        console.error(err);
      }
    }
    setScanning(false);
  };

  function onScanSuccess(decodedText: string, activeScanner?: Html5Qrcode) {
    // Analyze scanned text
    // E.g. https://domain.com/checkin/TEAM_ID
    // Or just raw TEAM_ID
    let teamId = decodedText.trim();
    if (decodedText.includes("/checkin/")) {
      const parts = decodedText.split("/checkin/");
      teamId = parts[parts.length - 1].split("?")[0].trim();
    }

    setScanResult(teamId);
    
    if (activeScanner) {
      try {
        activeScanner.stop().catch(err => console.error("Error stopping scanner instance:", err));
      } catch (err) {
        console.error(err);
      }
      scannerRef.current = null;
      setScanning(false);
    } else {
      stopScanner();
    }

    // Check if team exists in the loaded list
    const found = teams.find(t => t.id === teamId);
    if (found) {
      setScannedTeam(found);
      if (found.checkedIn) {
        setScanStatus("success"); // Already authorized
      } else {
        // Automatically request authorization
        authorizeCheckIn(found.id);
      }
    } else {
      setScanStatus("error"); // Not found in registered/approved teams
    }
  }

  function onScanFailure() {
    // Ignored silent error frame logs
  }

  // Clear states on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        try {
          scanner.stop().catch(err => console.error(err));
        } catch (err) {
          console.error(err);
        }
      }
    };
  }, []);

  // Filter list
  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalApproved = teams.length;
  const checkedInCount = teams.filter(t => t.checkedIn).length;
  const pendingCount = totalApproved - checkedInCount;
  const progressPercent = totalApproved > 0 ? Math.round((checkedInCount / totalApproved) * 100) : 0;

  if (loading) {
    return (
      <div className="h-[40vh] w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white flex items-center gap-3">
            Attendance <span className="text-white/20">Gate</span>
          </h2>
          <p className="text-white/40 text-sm mt-1">Holographic registration tracking and check-in node.</p>
        </div>
        
        {/* Real-time stats */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex gap-6 items-center">
          <div className="text-center px-2">
            <div className="text-[9px] font-black uppercase tracking-wider text-green-500 opacity-60">VERIFIED ENTRY</div>
            <div className="text-xl font-black italic mt-1">{checkedInCount} <span className="text-xs text-white/30">/ {totalApproved}</span></div>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="text-center px-2">
            <div className="text-[9px] font-black uppercase tracking-wider text-accent-500 opacity-60">PENDING AT DOOR</div>
            <div className="text-xl font-black italic mt-1">{pendingCount}</div>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center font-black text-black text-xs shadow-[0_5px_15px_rgba(34,197,94,0.3)]">
            {progressPercent}%
          </div>
        </div>
      </div>

      {actionStatus && (
        <div className={cn(
          "p-4 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-4",
          actionStatus.type === "success" 
            ? "bg-green-500/10 border-green-500/20 text-green-400" 
            : "bg-red-500/10 border-red-500/20 text-red-500"
        )}>
          <span>{actionStatus.message}</span>
          <button onClick={() => setActionStatus(null)} className="text-white/40 hover:text-white transition-colors cursor-pointer text-[10px] font-black uppercase">
            [Dismiss]
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Live Scanner Node & Stats */}
        <div className="space-y-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 text-center space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">LOBBY TERMINAL</span>
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {/* Video Viewport Wrapper */}
            <div className="aspect-square bg-black/60 border border-white/5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
              {scanning ? (
                <div id="qr-scanner-element" className="w-full h-full object-cover" />
              ) : (
                <div className="p-8 space-y-3 flex flex-col items-center select-none text-center">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-accent-500/15 group-hover:border-accent-500/20 transition-all duration-300">
                    <QrCode className="w-8 h-8 text-white/20 group-hover:text-accent-500 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-white/70 tracking-widest leading-none mt-2">Scanner Offline</h4>
                    <p className="text-[9px] text-white/30 font-bold mt-1 max-w-[150px] uppercase tracking-wide">Ready for contactless verification</p>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Scanner Controls */}
            {scanning ? (
              <button
                onClick={stopScanner}
                className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
              >
                Abort Scan Operations
              </button>
            ) : (
              <button
                onClick={startScanner}
                className="w-full py-4 bg-white text-black hover:bg-accent-500 hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(255,255,255,0.05)]"
              >
                <Camera className="w-3.5 h-3.5" /> Launch Input Camera
              </button>
            )}
          </div>

          {/* Real-time scan matching layout */}
          {scanResult && (
            <div className={cn(
              "border rounded-[32px] p-6 space-y-4 shadow-lg transition-all",
              scanStatus === "success" ? "bg-green-500/10 border-green-500/30" :
              scanStatus === "error" ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10 animate-pulse"
            )}>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">SCANNED PACKET RECEIVED</span>
                <span className={cn(
                  "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                  scanStatus === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                  scanStatus === "error" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-accent-500/10 border-accent-500/20 text-accent-400"
                )}>
                  {scanStatus.toUpperCase()}
                </span>
              </div>

              {scannedTeam ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter italic text-white leading-none">{scannedTeam.name}</h3>
                    <p className="text-[9px] font-mono text-white/30 uppercase mt-1">HASH: {scannedTeam.id.substring(0, 15).toUpperCase()}...</p>
                  </div>
                  
                  <div className="p-3 bg-black/40 rounded-xl space-y-1 border border-white/5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-white/30 uppercase tracking-widest">SQUAD ORIGIN</span>
                      <span className="text-accent-500 uppercase">{scannedTeam.city || "DEHRADUN"}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-white/30 uppercase tracking-widest">CREW SIZE</span>
                      <span className="text-white">{scannedTeam.memberEmails ? scannedTeam.memberEmails.length : 1} MEMBERS</span>
                    </div>
                  </div>

                  {scanStatus === "processing" ? (
                    <div className="text-center py-2">
                      <Loader2 className="w-5 h-5 text-accent-400 animate-spin mx-auto mb-1" />
                      <span className="text-[8px] uppercase tracking-widest text-white/30 font-black">Authorizing Security Clearances...</span>
                    </div>
                  ) : scanStatus === "success" ? (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] uppercase font-black tracking-widest text-center rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" /> ENTRY GRANTED
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-1 text-center py-2">
                  <Ban className="w-6 h-6 text-red-500 mx-auto opacity-60 mb-1" />
                  <p className="text-xs font-black uppercase text-red-500 tracking-tight">Access Protocol Rejected</p>
                  <p className="text-[9px] text-white/30 font-bold max-w-[200px] mx-auto uppercase">Scanned packet does not match any approved squad in database</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column (2/3 size): Search & Table/List of Checked-In approved teams */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
            {/* Search inputs */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lookup approved squads by name, ID or city..."
                className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-2xl focus:border-white outline-none transition-all text-sm font-bold placeholder:text-white/25 text-white"
              />
              <Search className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Approved Teams Manifest list */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
              {filteredTeams.length > 0 ? (
                filteredTeams.map((t) => (
                  <div 
                    key={t.id} 
                    className={cn(
                      "p-4 border rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                      t.checkedIn 
                        ? "bg-green-500/5 border-green-500/15 hover:border-green-500/35" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/15"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black uppercase tracking-tight italic text-base leading-none text-white">{t.name}</h4>
                        <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">{t.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                      
                      {/* Subtitles details */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">
                        <span className="text-accent-500/70">{t.city || "Dehradun"}</span>
                        <span className="text-white/15">•</span>
                        <span>{t.memberEmails ? t.memberEmails.length : 1} Members</span>
                        {t.checkedIn && (
                          <>
                            <span className="text-white/15">•</span>
                            <span className="text-green-500/70">By: {t.checkedInBy || "Scanner"}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Check-In Action Button */}
                      <button
                        onClick={() => toggleCheckIn(t.id, !!t.checkedIn)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5",
                          t.checkedIn
                            ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 hover:content-['Ab']"
                            : "bg-accent-500/10 border-accent-500/20 text-accent-400 hover:bg-accent-500 hover:text-black hover:border-accent-500"
                        )}
                      >
                        {t.checkedIn ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> REGISTER GATE
                          </>
                        )}
                      </button>

                      {/* Send QR Ticket Button */}
                      <button
                        onClick={() => sendQrEmail(t)}
                        disabled={sendingId === t.id}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5",
                          sendingId === t.id
                            ? "bg-accent-500/10 border-accent-500/20 text-accent-400 cursor-not-allowed"
                            : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-accent-500/50 hover:bg-accent-500/10 cursor-pointer"
                        )}
                        title="Send QR Ticket via Email to Team Lead"
                      >
                        {sendingId === t.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-500" />
                        ) : (
                          <Mail className="w-3.5 h-3.5 text-accent-500" />
                        )}
                        <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest pl-0.5">
                          {sendingId === t.id ? "SENDING..." : "EMAIL QR"}
                        </span>
                      </button>

                      {/* Launch pass checker link button */}
                      <a
                        href={`/checkin/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/25 rounded-xl transition-all"
                        title="Display Ticket Flyer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl opacity-20 uppercase tracking-[0.2em] font-black text-xs">
                  No registered approved squads match search
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
