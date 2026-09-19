import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy,
  getDocs
} from "firebase/firestore";
import { 
  Users, 
  Star, 
  XCircle, 
  FileText, 
  ChevronRight, 
  Database,
  Loader2,
  Trophy,
  X,
  Target,
  Send,
  CheckCircle
} from "lucide-react";
import { cn } from "../lib/utils";

export default function MentorPanel({ user }: { user: User | null }) {
  const [activeTab, setActiveTab] = useState("assigned");
  const location = useLocation();

  useEffect(() => {
    const tabFromPath = location.pathname.split("/").pop();
    if (tabFromPath && ["assigned", "evaluation", "elimination", "mail"].includes(tabFromPath)) {
      setActiveTab(tabFromPath);
    }
  }, [location]);

  if (!user) return null;

  return (
    <div className="pt-20 min-h-screen flex bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-md hidden lg:flex flex-col">
        <div className="p-8 pb-4">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-accent-500 mb-8">Mentor Protocol</p>
          <nav className="space-y-2">
            <SidebarLink to="/mentor/assigned" icon={Users} label="Assigned Squads" active={activeTab === "assigned"} />
            <SidebarLink to="/mentor/evaluation" icon={Star} label="Evaluation Hub" active={activeTab === "evaluation"} />
            <SidebarLink to="/mentor/elimination" icon={XCircle} label="Gate Authority" active={activeTab === "elimination"} />
            <SidebarLink to="/mentor/mail" icon={FileText} label="Mail Comms" active={activeTab === "mail"} />
          </nav>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <Routes>
          <Route path="/" element={<AssignedTeams user={user} />} />
          <Route path="/assigned" element={<AssignedTeams user={user} />} />
          <Route path="/evaluation" element={<MentorEvaluationManager user={user} />} />
          <Route path="/elimination" element={<MentorEliminationManager user={user} />} />
          <Route path="/mail" element={<MentorMailManager user={user} />} />
        </Routes>
      </main>
    </div>
  );
}

function SidebarLink({ to, icon: Icon, label, active }: any) {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center justify-between p-4 rounded-xl transition-all group",
        active ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("w-5 h-5", active ? "text-black" : "text-white/20 group-hover:text-accent-500")} />
        <span className="text-sm uppercase tracking-widest">{label}</span>
      </div>
      {active && <ChevronRight className="w-4 h-4" />}
    </Link>
  );
}

const formatTimestamp = (ts: any) => {
  if (!ts) return "Never";
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  if (ts instanceof Date) return ts.toLocaleString();
  return "Unknown";
};

function AssignedTeams({ user }: { user: User }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<any[]>([]);

  useEffect(() => {
    let unsubTeams: () => void;
    
    const findMentorAndTeams = async () => {
      try {
        const cleanEmail = user.email?.toLowerCase();
        if (!cleanEmail) {
          setLoading(false);
          return;
        }

        const tSnap = await getDocs(collection(db, "tracks"));
        setTracks(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const q = query(collection(db, "teams"), where("assignedMentorEmail", "==", cleanEmail));
        unsubTeams = onSnapshot(q, 
          (snap) => {
            setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          },
          (err) => {
            console.error("AssignedTeams listener error:", err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Error fetching assigned teams:", err);
        setLoading(false);
      }
    };

    findMentorAndTeams();

    return () => {
      if (unsubTeams) unsubTeams();
    };
  }, [user.uid, user.email]);

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic">Assigned <span className="text-white/20">Squadron</span></h2>
        <p className="text-white/40 text-sm mt-2 font-medium">Monitoring and guidance for your appointed teams.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.length === 0 ? (
          <div className="col-span-2 py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
            <p className="text-white/20 uppercase tracking-[0.2em] font-black text-xs">No teams assigned yet.</p>
          </div>
        ) : (
          teams.map(team => (
            <div key={team.id} className="bg-white/5 border border-white/10 p-8 rounded-[40px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">{team.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Database className="w-3 h-3 text-accent-500/50" />
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block">
                        {(() => {
                          const track = tracks.find(t => t.id === team.trackId || t.name === team.trackId);
                          return track ? (track.name || track.title) : team.trackId;
                        })()}
                      </span>
                    </div>
                  </div>
                 <span className={cn(
                    "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                    team.isEliminated ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                 )}>
                    {team.isEliminated ? 'ELIMINATED' : 'ACTIVE'}
                 </span>
              </div>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Members</span>
                       <span className="text-xs font-bold text-white/70">{team.members?.length || 0} Participants</span>
                    </div>
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Average Score</span>
                       <span className="text-xs font-bold text-white/70">TBD</span>
                    </div>
                 </div>
                 <Link to="/mentor/evaluation" className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all">
                    View Submissions <ChevronRight className="w-4 h-4 ml-1" />
                 </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MentorEvaluationManager({ user }: { user: User }) {
  const [rounds, setRounds] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [comments, setComments] = useState("");
  const [tracks, setTracks] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);

  useEffect(() => {
    let unsubRounds: () => void;
    let unsubTeams: () => void;

    const setupListeners = async () => {
      try {
        const cleanEmail = user.email?.toLowerCase();
        if (!cleanEmail) {
          setLoading(false);
          return;
        }

        unsubRounds = onSnapshot(query(collection(db, "rounds"), orderBy("order", "asc")), 
          (snap) => {
            const r = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRounds(r);
            // Pick the active round with the highest order if multiple exist
            const active = [...r].reverse().find((round: any) => round.isActive);
            if (active) {
              setActiveRound((prev: any) => prev || active);
            } else if (r.length > 0) {
              setActiveRound((prev: any) => prev || r[0]);
            }
          },
          (err) => {
            console.error("Evaluation rounds listener error:", err);
            setLoading(false);
          }
        );

        unsubTeams = onSnapshot(query(collection(db, "teams"), where("assignedMentorEmail", "==", cleanEmail)), 
          (snap) => {
            setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          },
          (err) => {
            console.error("Evaluation teams listener error:", err);
            setLoading(false);
          }
        );

        const tracksSnap = await getDocs(collection(db, "tracks"));
        setTracks(tracksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const problemsSnap = await getDocs(collection(db, "problems"));
        setProblems(problemsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error setting up evaluation listeners:", err);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubRounds) unsubRounds();
      if (unsubTeams) unsubTeams();
    };
  }, [user.uid, user.email]);

  const saveEvaluation = async (teamId: string) => {
    if (!activeRound) return;
    try {
      const team = teams.find(t => t.id === teamId);
      const evals = { ...(team.roundEvaluations || {}) };
      evals[activeRound.order.toString()] = {
        marks,
        comments,
        updatedAt: new Date()
      };
      await updateDoc(doc(db, "teams", teamId), { roundEvaluations: evals });
      setEvaluating(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  // Show teams that have reached this round or beyond
  const currentTeams = teams.filter(t => !t.isEliminated && (t.currentRoundOrder >= (activeRound?.order || 0)));
  const eliminatedInThisRound = teams.filter(t => t.isEliminated && t.currentRoundOrder === activeRound?.order);
  const visibleTeams = [...currentTeams, ...eliminatedInThisRound];

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Evaluation <span className="text-white/20">Hub</span></h2>
        <p className="text-white/40 text-sm mt-2 font-medium">Review your assigned squads' progress and assign scores.</p>
      </div>

      {rounds.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar w-full">
          {rounds.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRound(r)}
              className={cn(
                "whitespace-nowrap px-6 py-4 rounded-xl border transition-all flex flex-col items-start gap-1 min-w-[200px] shrink-0",
                activeRound?.id === r.id 
                  ? "bg-accent-500 border-accent-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]" 
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
              )}
            >
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", activeRound?.id === r.id ? "text-black/60" : "text-accent-500")}>
                Round {r.order}
              </span>
              <span className="font-black text-sm uppercase tracking-tight">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      {activeRound && (
        <div className={cn(
          "p-6 rounded-3xl border transition-all flex flex-col items-start gap-1 relative",
          activeRound.isActive 
            ? "bg-accent-500/10 border-accent-500/30 text-accent-500 shadow-[0_0_20px_rgba(34,197,94,0.05)]" 
            : "bg-white/5 border-white/10 text-white/40"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-accent-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-500">Active Operational Phase</span>
            {activeRound.isActive && (
              <span className="bg-accent-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Live</span>
            )}
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">
            Round {activeRound.order}: {activeRound.name}
          </h3>
          <p className="text-white/40 text-xs font-medium mt-2 max-w-2xl leading-relaxed italic">
            {activeRound.description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {visibleTeams.length === 0 ? (
          <div className="py-24 text-center bg-white/5 border border-dashed border-white/10 rounded-[40px]">
            <Trophy className="w-16 h-16 text-white/5 mx-auto mb-6" />
            <p className="text-white/20 uppercase tracking-[0.3em] font-black text-xs">No assigned squads records for this sector.</p>
          </div>
        ) : (
          visibleTeams.map(team => {
            const submission = team.roundSubmissions?.[activeRound.order.toString()];
            const evaluation = team.roundEvaluations?.[activeRound.order.toString()];
            const isEvaluating = evaluating === team.id;

            return (
              <div key={team.id} className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-8 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white">{team.name}</h3>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2">
                        <Database className="w-3 h-3 text-accent-500/50" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                          Track: {(() => {
                            const track = tracks.find(t => t.id === team.trackId || t.name === team.trackId);
                            return track ? (track.name || track.title) : team.trackId;
                          })()}
                        </span>
                      </div>
                      {(() => {
                        const problem = problems.find(p => p.trackId === team.trackId || p.id === team.problemId);
                        return problem ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <FileText className="w-3 h-3 text-accent-500/50" />
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-none">
                              Problem: {problem.title}
                            </span>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex items-center gap-4 mt-1">
                        {evaluation ? (
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-accent-500 fill-accent-500" />
                            <span className="text-xl font-black text-accent-500">{evaluation.marks}/100</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black bg-accent-500/10 text-accent-500 px-3 py-1 rounded-full uppercase tracking-widest border border-accent-500/20">Pending Evaluation</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        setEvaluating(isEvaluating ? null : team.id);
                        setMarks(evaluation?.marks || 0);
                        setComments(evaluation?.comments || "");
                    }}
                    className={cn(
                        "px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all",
                        isEvaluating ? "bg-white text-black" : "bg-accent-500 text-black shadow-[0_10px_30px_rgba(34,197,94,0.2)]"
                    )}
                  >
                    {isEvaluating ? "Cancel Edit" : (evaluation ? "Review Evaluation" : "Start Evaluation")}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Submission View */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-white/30">
                      <Star className="w-4 h-4" />
                      <span className="text-[10px] uppercase font-black tracking-widest">Submission Data</span>
                    </div>

                    {/* Problem Statement Detail */}
                    {(() => {
                        const problem = problems.find(p => p.trackId === team.trackId || p.id === team.problemId);
                        if (!problem) return null;
                        return (
                          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                             <h4 className="text-[9px] font-black uppercase tracking-widest text-accent-500/80 mb-2">Operational Goal: {problem.title}</h4>
                             <p className="text-[11px] text-white/40 leading-relaxed italic">{problem.description}</p>
                          </div>
                        );
                    })()}

                    {submission ? (
                      <div className="p-6 bg-black/40 border border-white/5 rounded-3xl min-h-[150px]">
                        <p className="text-white/70 italic text-sm leading-relaxed whitespace-pre-wrap">{submission.workDone}</p>
                        <p className="mt-4 text-[9px] text-white/20 font-bold uppercase tracking-widest">Logged: {formatTimestamp(submission.updatedAt)}</p>
                      </div>
                    ) : (
                      <div className="p-6 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center flex flex-col items-center justify-center min-h-[150px]">
                        <p className="text-white/20 text-xs font-bold uppercase tracking-widest italic">Awaiting Terminal Data...</p>
                      </div>
                    )}
                  </div>

                  {/* Evaluation Interface */}
                  {isEvaluating && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                       <div className="flex items-center gap-2 text-accent-500">
                          <Target className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-black tracking-widest">Evaluation Form</span>
                       </div>
                       <div className="space-y-4 bg-accent-500/5 p-6 rounded-3xl border border-accent-500/20 shadow-[0_0_50px_rgba(34,197,94,0.05)]">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Assign Marks (0-100)</label>
                             <input 
                               type="number" 
                               max={100}
                               min={0}
                               value={marks}
                               onChange={(e) => setMarks(parseInt(e.target.value) || 0)}
                               className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-accent-500 font-black text-2xl outline-none focus:border-accent-500"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Mentor Feedback</label>
                             <textarea 
                               placeholder="Assign comments, logic critique, or advice..."
                               value={comments}
                               onChange={(e) => setComments(e.target.value)}
                               className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm min-h-[120px] outline-none focus:border-accent-500 leading-relaxed text-white/80"
                             />
                          </div>
                          <button 
                            onClick={() => saveEvaluation(team.id)}
                            className="w-full py-4 bg-accent-500 text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-accent-400 transition-all flex items-center justify-center gap-2"
                          >
                            <Send className="w-3.5 h-3.5" /> Synchronize Records
                          </button>
                       </div>
                    </div>
                  )}

                  {!isEvaluating && evaluation && (
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-black tracking-widest">Records Entry</span>
                       </div>
                       <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl min-h-[150px]">
                          <p className="text-green-500/70 text-sm leading-relaxed italic">"{evaluation.comments}"</p>
                       </div>
                     </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MentorEliminationManager({ user }: { user: User }) {
  const [rounds, setRounds] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Gate State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'qualified' | 'eliminated' | null>(null);
  const [gateMarks, setGateMarks] = useState<number>(0);
  const [gateNote, setGateNote] = useState("");

  useEffect(() => {
    let unsubRounds: () => void;
    let unsubTeams: () => void;

    const setupListeners = async () => {
      try {
        const cleanEmail = user.email?.toLowerCase();
        if (!cleanEmail) {
          setLoading(false);
          return;
        }

        unsubRounds = onSnapshot(query(collection(db, "rounds"), orderBy("order", "asc")), 
          (snap) => {
            const r = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRounds(r);
            // Pick the active round with the highest order if multiple exist
            const active = [...r].reverse().find((round: any) => round.isActive);
            if (active) {
              setActiveRound((prev: any) => prev || active);
            } else if (r.length > 0) {
              setActiveRound((prev: any) => prev || r[0]);
            }
          },
          (err) => {
            console.error("Elimination rounds listener error:", err);
            setLoading(false);
          }
        );

        unsubTeams = onSnapshot(query(collection(db, "teams"), where("assignedMentorEmail", "==", cleanEmail)), 
          (snap) => {
            setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          },
          (err) => {
            console.error("Elimination teams listener error:", err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Error setting up elimination listeners:", err);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubRounds) unsubRounds();
      if (unsubTeams) unsubTeams();
    };
  }, [user.uid, user.email]);

  const processTeam = async (team: any) => {
    if (!processingStatus) return;
    try {
      const isQualified = processingStatus === 'qualified';
      const updates: any = {};
      
      if (isQualified) {
        updates.currentRoundOrder = (team.currentRoundOrder || 1) + 1;
        updates.isEliminated = false;
      } else {
        updates.isEliminated = true;
      }

      if (activeRound) {
        const evals = { ...(team.roundEvaluations || {}) };
        evals[activeRound.order.toString()] = {
          marks: gateMarks,
          comments: gateNote,
          updatedAt: new Date()
        };
        updates.roundEvaluations = evals;
      }

      await updateDoc(doc(db, "teams", team.id), updates);

      fetch("/api/send-qualification-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: team.memberEmails || [team.contactEmail],
          teamName: team.name,
          status: processingStatus,
          roundName: activeRound?.name,
          marks: gateMarks,
          note: gateNote
        })
      }).catch(console.error);

      setProcessingId(null);
      setProcessingStatus(null);
      setGateMarks(0);
      setGateNote("");
    } catch (err) { 
      handleFirestoreError(err, OperationType.UPDATE, `teams/${team.id}`); 
    }
  };

  const revertDecision = async (team: any) => {
    try {
      const updates: any = {
        isEliminated: false,
        currentRoundOrder: activeRound?.order || team.currentRoundOrder
      };
      await updateDoc(doc(db, "teams", team.id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${team.id}`);
    }
  };

  const contenders = teams.filter(t => !t.isEliminated && t.currentRoundOrder === activeRound?.order);
  const decided = teams.filter(t => (t.isEliminated && t.currentRoundOrder === activeRound?.order) || (!t.isEliminated && t.currentRoundOrder > activeRound?.order));

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Gate <span className="text-white/20">Authority</span></h2>
        <p className="text-white/40 text-sm mt-2 font-medium">Finalize progression or elimination for your assigned squads.</p>
      </div>

      {rounds.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar w-full">
          {rounds.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRound(r)}
              className={cn(
                "whitespace-nowrap px-6 py-4 rounded-xl border transition-all flex flex-col items-start gap-1 min-w-[200px] shrink-0",
                activeRound?.id === r.id 
                  ? "bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
              )}
            >
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", activeRound?.id === r.id ? "text-white/60" : "text-red-500")}>
                Round {r.order}
              </span>
              <span className="font-black text-sm uppercase tracking-tight">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      {activeRound && (
        <div className={cn(
          "p-6 rounded-3xl border transition-all flex flex-col items-start gap-1 relative",
          activeRound.isActive 
            ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.05)]" 
            : "bg-white/5 border-white/10 text-white/40"
        )}>
           <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Elimination Gate Active</span>
            {activeRound.isActive && (
              <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Open</span>
            )}
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">
            Round {activeRound.order}: {activeRound.name}
          </h3>
          <p className="text-white/40 text-xs font-medium mt-2 italic">
            Process teams who have completed this operational phase.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contenders.length === 0 && decided.length === 0 ? (
          <div className="col-span-2 py-24 text-center bg-white/5 border border-dashed border-white/10 rounded-[40px]">
             <CheckCircle className="w-16 h-16 text-white/5 mx-auto mb-6" />
             <p className="text-white/20 uppercase tracking-[0.2em] font-black text-xs">No teams available for processing in this round.</p>
          </div>
        ) : (
          contenders.map(team => {
            const isProcessing = processingId === team.id;
            return (
              <div key={team.id} className="bg-white/5 border border-white/10 p-8 rounded-[40px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 pointer-events-none transition-all group-hover:bg-accent-500/10" />
                {isProcessing ? (
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <h4 className={cn(
                        "text-xl font-black uppercase tracking-tighter leading-none italic",
                        processingStatus === 'qualified' ? "text-green-500" : "text-red-500"
                      )}>Decision: {processingStatus}</h4>
                      <button onClick={() => setProcessingId(null)} className="p-2 text-white/20 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[8px] font-black uppercase tracking-widest text-white/20 ml-2">Gate Score</label>
                         <input 
                            type="number" 
                            placeholder="Score"
                            value={gateMarks}
                            onChange={(e) => setGateMarks(parseInt(e.target.value) || 0)}
                            className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-accent-500 font-black text-xl outline-none focus:border-accent-500"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[8px] font-black uppercase tracking-widest text-white/20 ml-2">Notes for Team</label>
                         <textarea 
                            placeholder="Why this decision? Critical feedback..."
                            value={gateNote}
                            onChange={(e) => setGateNote(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm min-h-[100px] outline-none focus:border-accent-500"
                         />
                      </div>
                      <button 
                        onClick={() => processTeam(team)}
                        className={cn(
                          "w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all",
                          processingStatus === 'qualified' ? "bg-green-500 text-black shadow-[0_10px_30px_rgba(34,197,94,0.2)]" : "bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
                        )}
                      >
                        Confirm {processingStatus}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 relative z-10">
                    <h4 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">{team.name}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => { setProcessingId(team.id); setProcessingStatus('qualified'); }}
                        className="bg-green-500/10 text-green-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-green-500 hover:text-black transition-all border border-green-500/20"
                      >
                        Qualify
                      </button>
                      <button 
                        onClick={() => { setProcessingId(team.id); setProcessingStatus('eliminated'); }}
                        className="bg-red-500/10 text-red-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                      >
                        Eliminate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {decided.length > 0 && (
        <div className="space-y-6 pt-12">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black uppercase text-white/30 tracking-widest italic leading-none">Processed Decisions</h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {decided.map(team => (
              <div key={team.id} className="bg-white/[0.02] border border-white/5 p-8 rounded-[40px] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    team.isEliminated ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                  )}>
                    {team.isEliminated ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-black uppercase text-white text-lg leading-none tracking-tight">{team.name}</h4>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-[0.2em] mt-2 block",
                      team.isEliminated ? "text-red-500/50" : "text-green-500/50"
                    )}>
                      {team.isEliminated ? 'ELIMINATED' : `QUALIFIED (ADVANCED TO RD ${team.currentRoundOrder})`}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => revertDecision(team)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all text-white/40 hover:text-white border border-white/5"
                >
                  Revert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MentorMailManager({ user }: { user: User }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const q = query(collection(db, "teams"), where("assignedMentorEmail", "==", user.email));
        const snap = await getDocs(q);
        setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching teams for mail:", err);
      }
    };

    fetchTeams();
  }, [user.uid, user.email]);

  const toggleTeam = (id: string) => {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (selectedTeams.length === 0 || !subject || !message) {
      setStatus("Error: Incomplete Protocol Data.");
      return;
    }

    setSending(true);
    setStatus("Transmitting Signal...");

    try {
      const targetTeams = teams.filter(t => selectedTeams.includes(t.id));
      const emails = targetTeams.flatMap(t => t.memberEmails || [t.contactEmail]);

      const res = await fetch("/api/send-bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, subject, message })
      });

      const data = await res.json();
      if (data.success) {
        setStatus(`Broadcast Success: ${data.results.length} encrypted signals sent.`);
        setSubject("");
        setMessage("");
        setSelectedTeams([]);
      } else {
        setStatus(`Broadcast Failure: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("Critical Error: Connection Interrupted.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Mail <span className="text-white/20">Comms</span></h2>
        <p className="text-white/40 text-sm mt-2 font-medium">Broadcast directives to your assigned squads.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
           <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Target Selection ({selectedTeams.length})</p>
           <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {teams.map(team => (
                 <button 
                  key={team.id}
                  onClick={() => toggleTeam(team.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    selectedTeams.includes(team.id) ? "bg-accent-500 border-accent-400 text-black" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                  )}
                 >
                   <span className="font-bold text-sm uppercase tracking-tight">{team.name}</span>
                   {selectedTeams.includes(team.id) && <CheckCircle className="w-4 h-4" />}
                 </button>
              ))}
           </div>
        </div>

        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Transmission Data</p>
          <div className="space-y-4">
            <input 
              placeholder="Signal Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-accent-500 outline-none text-sm font-bold uppercase tracking-widest"
            />
            <textarea 
              placeholder="Your directive here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-accent-500 outline-none text-sm min-h-[250px] leading-relaxed"
            />
            {status && (
              <div className={cn(
                "p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                status.includes("Error") || status.includes("Failure") ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
              )}>
                {status}
              </div>
            )}
            <button 
              onClick={handleSend}
              disabled={sending}
              className="w-full py-5 bg-accent-500 text-black font-black uppercase tracking-[0.3em] text-xs rounded-xl hover:bg-accent-400 disabled:opacity-30 transition-all flex items-center justify-center gap-3"
            >
              {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
              Transmit Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
