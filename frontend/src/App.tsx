/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { supabase, type User } from "./lib/supabase";
import LandingPage from "./pages/LandingPage";
import TracksPage from "./pages/TracksPage";
import SchedulePage from "./pages/SchedulePage";
import AboutPage from "./pages/AboutPage";
import RegistrationPage from "./pages/RegistrationPage";
import AdminPanel from "./pages/AdminPanel";
import MentorPanel from "./pages/MentorPanel";
import TeamDashboard from "./pages/TeamDashboard";
import CheckInPage from "./pages/CheckInPage";
import Navbar from "./components/Navbar";
import { Loader2 } from "lucide-react";
import { EVENT_DATES } from "./lib/event";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);

  useEffect(() => {
    // The server derives role + permissions from event_team / mentors and
    // writes the profile row; the client just reads the answer back.
    const applySession = async (authUser: User | null) => {
      setUser(authUser);
      if (!authUser) {
        setIsAdmin(false);
        setIsMentor(false);
        setPermissions(null);
        return;
      }
      try {
        const { data, error } = await supabase.rpc("sync_my_profile");
        if (error) throw error;
        const profile = Array.isArray(data) ? data[0] : data;
        const role = profile?.role ?? "user";
        setIsAdmin(role === "admin" || role === "event_team");
        setIsMentor(role === "mentor");
        setPermissions(profile?.permissions ?? {});
      } catch (err) {
        console.error("Role sync failed:", err);
        setIsAdmin(false);
        setIsMentor(false);
        setPermissions({});
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session?.user ?? null))
      .catch((err) => console.error("Session load failed:", err))
      .finally(() => setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-canvas">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-canvas text-white font-sans overflow-x-clip">
        <Navbar user={user} isAdmin={isAdmin} isMentor={isMentor} />
        <main id="main">
          <Routes>
            <Route path="/" element={<LandingPage user={user} />} />
            <Route path="/tracks" element={<TracksPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/register" element={<RegistrationPage user={user} />} />
            <Route path="/dashboard" element={<TeamDashboard user={user} isAdmin={isAdmin} isMentor={isMentor} />} />
            <Route path="/checkin/:teamId" element={<CheckInPage user={user} isAdmin={isAdmin} isMentor={isMentor} />} />
            <Route path="/admin/*" element={isAdmin ? <AdminPanel permissions={permissions} /> : <div className="py-32 px-6 text-center"><p className="font-display text-2xl font-bold text-white/80">Admin access required</p><p className="text-white/40 text-sm mt-2">This account is not on the organising team.</p></div>} />
            <Route path="/mentor/*" element={isMentor ? <MentorPanel user={user} /> : <div className="py-32 px-6 text-center"><p className="font-display text-2xl font-bold text-white/80">Mentor access required</p><p className="text-white/40 text-sm mt-2">This account is not registered as a mentor.</p></div>} />
          </Routes>
        </main>
        <footer className="border-t border-white/10 bg-surface/30">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="font-display text-lg font-bold">
                Hacktoberfest <span className="text-accent-400">Dehradun</span> 2026
              </div>
              <p className="text-white/45 text-sm mt-3 max-w-sm leading-relaxed">
                A 24-hour Generative AI build sprint organised by BFIT College Dehradun,
                in collaboration with MLH and Google.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-[11px] tracking-[0.25em] uppercase text-white/35 mb-4">Event</h2>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/tracks" className="text-white/60 hover:text-white transition-colors">Tracks</Link></li>
                <li><Link to="/schedule" className="text-white/60 hover:text-white transition-colors">Schedule</Link></li>
                <li><Link to="/about" className="text-white/60 hover:text-white transition-colors">About</Link></li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-[11px] tracking-[0.25em] uppercase text-white/35 mb-4">When &amp; where</h2>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li>{EVENT_DATES}</li>
                <li>BFIT College, Dehradun</li>
                <li className="text-white/35 text-[14px]">Start time announced by email</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-white/35 text-[14px]">&copy; 2026 Hacktoberfest Dehradun. Organised by BFIT College Dehradun.</p>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/25">In collaboration with MLH &amp; Google</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
