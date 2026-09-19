import { useState, useEffect } from "react";
import { User, signInWithPopup } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { db, auth, googleProvider, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  onSnapshot 
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Send,
  Loader2,
  ChevronRight,
  TrendingUp,
  Target,
  UserCheck,
  Database
} from "lucide-react";
import { cn } from "../lib/utils";
import TeamQRCode from "../components/TeamQRCode";

interface Team {
  id: string;
  name: string;
  city: string;
  trackId: string;
  problemId: string;
  status: string;
  currentRoundOrder: number;
  isEliminated: boolean;
  roundSubmissions: Record<string, { workDone: string, updatedAt: any }>;
  roundEvaluations: Record<string, { marks: number, comments: string }>;
  assignedMentorName?: string;
  assignedMentorEmail?: string;
  assignedMentorDesignation?: string;
  assignedMentorCompany?: string;
  memberEmails: string[];
}

interface Round {
  id: string;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
}

export default function TeamDashboard({ user, isAdmin, isMentor }: { user: User | null; isAdmin?: boolean; isMentor?: boolean }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workDone, setWorkDone] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin");
      return;
    }
    if (isMentor) {
      navigate("/mentor");
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch Rounds
    const roundsRef = collection(db, "rounds");
    const unsubRounds = onSnapshot(roundsRef, (snap) => {
      const r = snap.docs.map(d => ({ id: d.id, ...d.data() } as Round));
      setRounds(r.sort((a, b) => a.order - b.order));
    }, (err) => handleFirestoreError(err, OperationType.GET, "rounds"));

    // Fetch Tracks
    const unsubTracks = onSnapshot(collection(db, "tracks"), (snap) => {
      setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Problems
    const unsubProblems = onSnapshot(collection(db, "problems"), (snap) => {
      setProblems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch User's Team
    const teamsRef = collection(db, "teams");
    const q = query(
      teamsRef, 
      where("memberEmails", "array-contains", user.email),
      where("status", "==", "approved")
    );
    
    const unsubTeam = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const teamDoc = snap.docs[0];
        const data = teamDoc.data() as Team;
        setTeam({ ...data, id: teamDoc.id });
      } else {
        setTeam(null);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "teams"));

    return () => {
      unsubRounds();
      unsubTracks();
      unsubProblems();
      unsubTeam();
    };
  }, [user, isAdmin, isMentor]);

  // Pre-fill workDone when team or active round changes
  useEffect(() => {
    if (team) {
      const gActive = [...rounds].reverse().find(r => r.isActive);
      const subRound = gActive?.order ?? team.currentRoundOrder;
      const subRoundKey = subRound.toString();
      
      if (team.roundSubmissions && team.roundSubmissions[subRoundKey]) {
        setWorkDone(team.roundSubmissions[subRoundKey].workDone || "");
      } else {
        setWorkDone("");
      }
    }
  }, [team?.id, rounds, team?.currentRoundOrder]);

  const globallyActiveRound = [...rounds].reverse().find(r => r.isActive);
  const activeRound = globallyActiveRound || rounds.find(r => r.order === (team?.currentRoundOrder || 1));
  const effectiveRoundOrder = team?.currentRoundOrder || 1;
  const submissionRoundOrder = activeRound?.order ?? effectiveRoundOrder;

  const formatTimestamp = (ts: any) => {
    if (!ts) return "Never";
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    if (ts instanceof Date) return ts.toLocaleString();
    return "Unknown";
  };

  const handleSubmitWork = async () => {
    if (!team) return;
    setSubmitting(true);
    setMessage(null);

    const submissionRoundKey = submissionRoundOrder.toString();
    const submissions = { ...(team.roundSubmissions || {}) };
    submissions[submissionRoundKey] = {
      workDone: workDone.trim(),
      updatedAt: new Date()
    };

    try {
      await updateDoc(doc(db, "teams", team.id), {
        roundSubmissions: submissions
      });
      
      // Trigger confirmation email for the submission
      if (user?.email) {
        fetch("/api/send-submission-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            teamName: team.name,
            roundName: activeRound?.name || `Phase ${submissionRoundKey}`,
            timestamp: new Date().toLocaleString()
          })
        }).catch(err => console.error("Submission email trigger failed:", err));
      }

      setMessage({ type: 'success', text: "Progress successfully synced to the grid." });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${team.id}`);
      setMessage({ type: 'error', text: "Failed to transmit progress. Check your connection." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-6 text-center space-y-8 flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-16 h-16 text-accent-500/20 mb-4" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">Hacker Command Center</h2>
        <p className="text-white/40 max-w-md mx-auto italic text-sm md:text-base leading-relaxed">
          Please log in with your registered Google account to access your designated hacker dashboard.
        </p>
        
        {authError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">
            ⚠️ {authError}
          </div>
        )}

        <button 
          onClick={async () => {
            setAuthError(null);
            try {
              await signInWithPopup(auth, googleProvider);
            } catch (err: any) {
              if (err.code === 'auth/popup-blocked') {
                setAuthError("The login popup was blocked by your browser. Please allow popups or try again in a new tab.");
              } else if (err.code === 'auth/popup-closed-by-user') {
                setAuthError("Login popup was closed before completion.");
              } else {
                setAuthError("Google authentication failed. Please try again.");
                console.error("Popup authentication failed:", err);
              }
            }
          }}
          className="px-10 py-5 bg-accent-600 text-white font-black uppercase text-xs tracking-widest rounded-full hover:bg-accent-500 transition-all shadow-[0_10px_30px_rgba(34,197,94,0.3)] active:scale-95"
        >
          Authenticate With Google
        </button>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6 text-center">
        <AlertCircle className="w-16 h-16 text-white/10 mx-auto mb-6" />
        <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-4">Deployment Pending or Not Found</h2>
        <p className="text-white/40 mb-10 max-w-md mx-auto italic">
          Only <strong>Approved Squads</strong> can access the command center. If you recently registered, your application is currently being vetted by the admin council.
        </p>
        <Link 
          to="/register"
          className="px-8 py-4 bg-accent-600 rounded-full font-black uppercase text-xs tracking-widest text-white hover:bg-accent-500 transition-all inline-block"
        >
          Begin Registration
        </Link>
      </div>
    );
  }

  // const globallyActiveRound = ... (moved up)
  const nextRound = rounds.find(r => r.order === (activeRound?.order || 1) + 1);
  const progressPercentage = (effectiveRoundOrder / (rounds.length || 1)) * 100;

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-[0_0_10px_rgba(34,197,94,0.1)]",
              team.isEliminated ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-green-500/10 border-green-500/30 text-green-500"
            )}>
              {team.isEliminated ? "Disqualified" : "Active Selection"}
            </span>
            <span className="text-white/45 text-[10px] font-black uppercase tracking-widest">Team Dashboard</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">
            {team.name} <span className="text-white/45">Station</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6 bg-white/5 border border-white/5 p-4 rounded-3xl backdrop-blur-md">
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Current Phase</div>
            <div className="text-2xl font-black uppercase tracking-tighter italic">{activeRound?.name || `Round ${effectiveRoundOrder}`}</div>
          </div>
          <div className="w-12 h-12 bg-accent-500 rounded-2xl flex items-center justify-center font-black text-black">
            {Math.round(progressPercentage)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Col: Current Status & Submissions */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Current Round Objective */}
          <section className="bg-white/5 border border-white/10 p-8 rounded-[40px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[100px] pointer-events-none group-hover:bg-accent-500/10 transition-all duration-700" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-accent-500/10 rounded-2xl flex items-center justify-center border border-accent-500/20">
                <Target className="w-6 h-6 text-accent-500" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/30">Active Objective</h3>
                <h2 className="text-2xl font-black uppercase italic tracking-tight">{activeRound?.name || "Initializing..."}</h2>
              </div>
            </div>

            <p className="text-white/60 text-lg leading-relaxed mb-6 italic">
              {activeRound?.description || "Awaiting evaluation briefing."}
            </p>

            {/* Problem Statement Section */}
            {(() => {
              const problem = problems.find(p => p.trackId === team.trackId || p.id === team.problemId);
              if (!problem) return null;
              return (
                <div className="mb-8 p-6 bg-white/5 border border-white/5 rounded-3xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-500 mb-2 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" /> Problem Statement: {problem.title}
                  </h4>
                  <p className="text-white/50 text-sm leading-relaxed whitespace-pre-wrap">{problem.description}</p>
                </div>
              );
            })()}

            {/* Submission Form */}
            {!team.isEliminated && (
               <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-500">Submission Terminal</h4>
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest">
                    Last update: {formatTimestamp(team.roundSubmissions?.[submissionRoundOrder.toString()]?.updatedAt)}
                  </span>
                </div>
                
                <textarea 
                  className="w-full bg-black/40 border border-white/10 p-6 rounded-3xl min-h-[200px] text-white focus:border-accent-500 outline-none transition-all placeholder:text-white/10 font-medium leading-relaxed"
                  placeholder="Describe your progress, technical stack chosen, and logic implementation for this round..."
                  value={workDone}
                  onChange={(e) => setWorkDone(e.target.value)}
                />

                {message && (
                  <div className={cn(
                    "p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border animate-in fade-in slide-in-from-bottom-2",
                    message.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                  )}>
                    {message.text}
                  </div>
                )}

                <button 
                  onClick={handleSubmitWork}
                  disabled={submitting}
                  className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-accent-500 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Transmit Progress
                </button>
              </div>
            )}
           
            {team.isEliminated && (
              <div className="mt-8 p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h4 className="text-xl font-black uppercase tracking-tight text-white mb-2">Elimination Protocol Active</h4>
                <p className="text-white/40 text-sm italic">You are no longer authorized to submit progress for this cohort.</p>
              </div>
            )}
          </section>

          {/* Evaluations History */}
          <section className="space-y-8">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/45 ml-2">Evaluation Feedback</h3>
            
            <div className="grid grid-cols-1 gap-6">
              {rounds.filter(r => r.order < team.currentRoundOrder).length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                  <p className="text-white/45 uppercase tracking-widest text-xs font-bold italic leading-relaxed">No battle history detected.<br/>Complete the active round to see analysis.</p>
                </div>
              ) : (
                rounds.filter(r => r.order < team.currentRoundOrder).map((r) => {
                  const evalData = team.roundEvaluations?.[r.order.toString()];
                  return (
                    <div key={r.id} className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.05] transition-all group overflow-hidden relative">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                          <div className="text-[40px] font-black text-white/5 italic">{String(r.order).padStart(2, '0')}</div>
                          <div>
                            <h4 className="text-lg font-black uppercase tracking-tight italic">{r.name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Stage Complete</p>
                          </div>
                        </div>

                        {evalData ? (
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <div className="text-[9px] font-black uppercase tracking-widest text-accent-500 mb-1">Score Matrix</div>
                              <div className="text-3xl font-black italic">{evalData.marks}<span className="text-white/45 ml-1 text-sm">/100</span></div>
                            </div>
                            <div className="h-12 w-px bg-white/10 hidden md:block" />
                            <div className="max-w-sm">
                              <div className="flex items-center gap-2 mb-2 text-white/30">
                                <MessageSquare className="w-3 h-3 text-white/45" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Mentor Comments</span>
                              </div>
                              <p className="text-xs text-white/60 italic leading-relaxed">
                                "{evalData.comments || "Precision build. No critical corrections identified."}"
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-white/45 px-6 py-2 bg-white/5 rounded-full border border-white/5">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Awaiting Breakdown</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Col: Logistics & Team */}
        <div className="space-y-12">
          {/* Attendance Ticket Pass */}
          <TeamQRCode team={team} />

          {/* Mentor Assignment */}
          {(team.assignedMentorId || team.assignedMentorEmail || team.assignedMentorName) && (
            <div className="bg-gradient-to-r from-accent-500/10 to-accent-500/5 border border-accent-500/20 p-8 rounded-[40px] space-y-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-[40px] pointer-events-none" />
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-accent-500 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-500">Mission Mentor Assigned</h3>
               </div>
               
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-accent-500/10 border border-accent-500/20 rounded-[24px] flex items-center justify-center">
                    <UserCheck className="w-8 h-8 text-accent-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase tracking-tighter italic text-white leading-none">{team.assignedMentorName || "Assigned Industry Mentor"}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-500 mt-2">
                      {team.assignedMentorDesignation || 'Strategic Advisor'} {team.assignedMentorCompany ? `@ ${team.assignedMentorCompany}` : ''}
                    </p>
                    {team.assignedMentorEmail && (
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{team.assignedMentorEmail}</p>
                    )}
                  </div>
               </div>
               <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-[9px] text-white/30 italic leading-relaxed uppercase tracking-wider font-medium">
                     This industry veteran has been appointed to oversee your unit's progression through the elimination gates.
                  </p>
               </div>
            </div>
          )}

          {/* Active Round Status Box */}
          <div className="bg-accent-600 rounded-[40px] p-8 text-black shadow-[0_20px_50px_rgba(34,197,94,0.3)] relative overflow-hidden group">
             <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white opacity-5 rounded-full scale-150 group-hover:scale-[1.7] transition-all duration-700" />
             
             <div className="flex items-center gap-3 mb-6">
                <Target className="w-4 h-4 opacity-40" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Current Operation</span>
             </div>
             
             <h4 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4 italic">
               {activeRound?.name || "Initializing"}
             </h4>
             <p className="text-sm font-medium leading-relaxed mb-6 italic opacity-80 line-clamp-3">
               {activeRound?.description || "Standing by for sector instructions."}
             </p>

             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black/10 px-4 py-2 rounded-full border border-black/5 w-fit">
                Active Round {effectiveRoundOrder} <ChevronRight className="w-3 h-3" />
             </div>
          </div>

          {/* Logistics Box */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/45">Fleet Manifest</h3>
            
            <div className="space-y-6">
              {team.memberEmails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center font-black text-xs text-white/45 group-hover:bg-accent-500 group-hover:text-black transition-all">
                    {idx + 1}
                  </div>
                  <div>
                    <div className={cn(
                      "text-xs font-black uppercase tracking-tight",
                      email === user?.email ? "text-accent-500" : "text-white"
                    )}>
                      Participant
                    </div>
                    <div className="text-[10px] text-white/30 font-medium truncate max-w-[180px]">
                      {email}
                    </div>
                  </div>
                  {email === user?.email && (
                    <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
              ))}
            </div>

             <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/45 mb-1">Track</div>
                  <div className="text-xs font-black uppercase tracking-tight text-white italic">
                    {(() => {
                      const track = tracks.find(t => t.id === team.trackId || t.name === team.trackId || t.title === team.trackId);
                      return track ? (track.name || track.title) : team.trackId;
                    })()}
                  </div>
               </div>
               <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/45 mb-1">Current City</div>
                  <div className="text-xs font-black uppercase tracking-tight text-accent-500 italic mb-2">{team.city || "NOT SPECIFIED"}</div>
               </div>
               <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/45 mb-1">Problem Statement</div>
                  <div className="text-xs font-black uppercase tracking-tight text-white/60 italic leading-relaxed">
                    {(() => {
                      const problem = problems.find(p => p.id === team.problemId || p.title === team.problemId);
                      return problem ? (problem.description || problem.title) : team.problemId;
                    })()}
                  </div>
               </div>
            </div>
          </div>

          <div className="text-center p-8 bg-black/40 border border-white/5 rounded-[40px]">
             <CheckCircle2 className="w-8 h-8 text-white/10 mx-auto mb-4" />
             <p className="text-[10px] text-white/45 uppercase tracking-widest leading-relaxed">
               All communications are logged.<br/>Maintain protocol during active rounds.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
