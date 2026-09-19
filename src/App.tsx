/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import RegistrationPage from "./pages/RegistrationPage";
import AdminPanel from "./pages/AdminPanel";
import MentorPanel from "./pages/MentorPanel";
import TeamDashboard from "./pages/TeamDashboard";
import CheckInPage from "./pages/CheckInPage";
import Navbar from "./components/Navbar";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        setUser(authUser);
        if (authUser) {
          // Determine Role Strategy
          let finalRole = "user";
          let userPermissions: any = {};
          const adminEmail = "lubhanshsharma555@gmail.com";
          const cleanEmail = authUser.email?.toLowerCase().trim();

          // Pre-fetch user document for role sync
          const userDoc = await getDoc(doc(db, "users", authUser.uid));

          // 1. Hardcoded Admin Support (Super Admin)
          if (authUser.email === adminEmail) {
            finalRole = "admin";
            userPermissions = {
              manage_teams: true,
              manage_mentors: true,
              manage_rounds: true,
              manage_tracks: true,
              manage_timeline: true,
              manage_speakers: true,
              manage_partners: true,
              manage_event_team: true,
              manage_location: true,
              manage_email_marketing: true,
              manage_guests: true,
              view_teams: true,
              manage_attendance: true
            };
          } else {
            // 2. Dynamic Source of Truth Check (Priority over cached profile)
            if (cleanEmail) {
              // Check Event Team (Primary management role)
              const teamDoc = await getDoc(doc(db, "event_team", cleanEmail));
              if (teamDoc.exists()) {
                finalRole = "event_team";
                userPermissions = teamDoc.data().permissions || {};
              } else {
                // Check Mentors
                const mentorDoc = await getDoc(doc(db, "mentors", cleanEmail));
                if (mentorDoc.exists()) {
                  finalRole = "mentor";
                } else if (userDoc.exists()) {
                  // Fallback to cached role if no source of truth found
                  finalRole = userDoc.data().role || "user";
                  userPermissions = userDoc.data().permissions || {};
                }
              }
            } else if (userDoc.exists()) {
              finalRole = userDoc.data().role || "user";
              userPermissions = userDoc.data().permissions || {};
            }
          }

          // Update State
          setIsAdmin(finalRole === "admin" || finalRole === "event_team");
          setIsMentor(finalRole === "mentor");
          setPermissions(userPermissions);

          // Sync back to users collection for record keeping and secondary auth
          if (!userDoc.exists() || 
              userDoc.data().role !== finalRole || 
              JSON.stringify(userDoc.data().permissions || {}) !== JSON.stringify(userPermissions)) {
            try {
              await setDoc(doc(db, "users", authUser.uid), {
                email: authUser.email,
                role: finalRole,
                permissions: userPermissions,
                uid: authUser.uid,
                name: authUser.displayName,
                displayName: authUser.displayName,
                photoURL: authUser.photoURL,
                updatedAt: serverTimestamp()
              }, { merge: true });
            } catch (syncErr) {
              console.warn("Role sync encountered a non-critical block:", syncErr);
            }
          }
        } else {
          setIsAdmin(false);
          setIsMentor(false);
          setPermissions(null);
          setUser(null);
        }
      } catch (globalErr) {
        console.error("Global auth state error:", globalErr);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
              <h2 className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/35 mb-4">Event</h2>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/#tracks" className="text-white/60 hover:text-white transition-colors">Tracks</Link></li>
                <li><Link to="/#schedule" className="text-white/60 hover:text-white transition-colors">Schedule</Link></li>
                <li><Link to="/about" className="text-white/60 hover:text-white transition-colors">About</Link></li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/35 mb-4">When &amp; where</h2>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li>30&ndash;31 May 2026</li>
                <li>BFIT College, Dehradun</li>
                <li className="text-white/35 text-[13px]">Start time announced by email</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-white/35 text-[13px]">&copy; 2026 Hacktoberfest Dehradun. Organised by BFIT College Dehradun.</p>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/25">In collaboration with MLH &amp; Google</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
