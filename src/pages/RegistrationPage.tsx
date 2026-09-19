import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { User } from "firebase/auth";
import { db, auth, googleProvider, handleFirestoreError, OperationType } from "../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  UserPlus, 
  Trash2, 
  AlertCircle,
  Loader2,
  Lock
} from "lucide-react";
import { cn } from "../lib/utils";

export default function RegistrationPage({ user }: { user: User | null }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Database Data
  const [tracks, setTracks] = useState<any[]>([]);
  const [allProblems, setAllProblems] = useState<any[]>([]);

  // Form State
  const [selectedTrack, setSelectedTrack] = useState(searchParams.get("track") || "");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [teamName, setTeamName] = useState("");
  const [city, setCity] = useState("");
  const [members, setMembers] = useState([{ name: "", email: "", phone: "", role: "leader" }]);
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [consent, setConsent] = useState(false);

  const [registrationsOpen, setRegistrationsOpen] = useState(false);

  useEffect(() => {
    const unsubReg = onSnapshot(doc(db, "config", "registration"), (docSnap) => {
      const open = docSnap.exists() ? !!docSnap.data().open : false;
      setRegistrationsOpen(open);
      
      if (!open) {
        setFetching(false);
      } else {
        const fetchEventData = async () => {
          try {
            const tracksSnap = await getDocs(collection(db, "tracks"));
            const problemsSnap = await getDocs(collection(db, "problems"));
            
            setTracks(tracksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setAllProblems(problemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          } catch (err) {
            console.error("Failed to fetch event data", err);
          } finally {
            setFetching(false);
          }
        };

        fetchEventData();
      }
    }, (err) => {
      console.error("Failed to listen to registration status", err);
      setFetching(false);
    });

    return () => unsubReg();
  }, []);

  useEffect(() => {
    if (user?.email) setContactEmail(user.email);
  }, [user]);

  const addMember = () => {
    if (members.length < 3) {
      setMembers([...members, { name: "", email: "", phone: "", role: "member" }]);
    }
  };

  const removeMember = (index: number) => {
    if (members.length > 1 && members[index].role !== "leader") {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, field: "name" | "email" | "phone", value: string) => {
    const newMembers = [...members];
    // @ts-ignore
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const currentTrackData = tracks.find(t => t.id === selectedTrack || t.name === selectedTrack);
  const currentProblems = allProblems.filter(p => p.trackId === selectedTrack || p.trackId === currentTrackData?.id);

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be logged in to register.");
      return;
    }
    if (!consent) {
        setError("You must accept the travel and attendance consent.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      // PREVENT DUPLICATE REGISTRATIONS
      const allEmails = members.map(m => m.email.toLowerCase().trim());
      const allPhones = members.map(m => m.phone.trim());

      const teamsRef = collection(db, "teams");

      // Check if any email already exists
      const emailQuery = query(teamsRef, where("memberEmails", "array-contains-any", allEmails));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
          setError("One or more team members are already registered with this email. A member can only register once.");
          setLoading(false);
          return;
      }

      // Check if any phone already exists
      const phoneQuery = query(teamsRef, where("memberPhones", "array-contains-any", allPhones));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
          setError("One or more team members are already registered with this phone number. A member can only register once.");
          setLoading(false);
          return;
      }

      const teamData = {
        name: teamName,
        city: city,
        trackId: selectedTrack,
        problemId: selectedProblem,
        members: members,
        memberEmails: allEmails, // Persistent flat array for indexing
        memberPhones: allPhones, // Persistent flat array for indexing
        contactEmail: contactEmail.trim().toLowerCase(),
        consent: consent,
        status: 'pending',
        currentRoundOrder: 0,
        isEliminated: false,
        creatorUid: user.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "teams"), teamData);
      
      // Trigger background confirmation email for leader
      fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contactEmail.trim().toLowerCase(),
          name: members[0].name || user.displayName || "Participant",
          teamName: teamName
        })
      }).catch(err => console.error("Email trigger failed:", err));

      // Trigger notifications for other members
      const otherMembers = members.filter(m => m.role === "member" && m.email);
      if (otherMembers.length > 0) {
          fetch("/api/send-member-notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  leaderName: members[0].name || user.displayName || "Your Leader",
                  teamName: teamName,
                  members: otherMembers
              })
          }).catch(err => console.error("Member notification trigger failed:", err));
      }

      setStep(5); // Success step
    } catch (err: any) {
      // Log the error for the system to diagnose if needed
      console.error("Registration Error:", err);
      
      // Determine if it's a permission error (often due to rules/duplicates)
      if (err.message?.includes("insufficient permissions")) {
        setError("One or more team members might already be registered. Teams are restricted to one entry per participant.");
      } else {
        setError("Registration failed. Please verify your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return selectedTrack !== "";
    if (step === 2) return selectedProblem !== "";
    if (step === 3) return teamName.trim() !== "" && city.trim() !== "" && members.every(m => m.name && m.email && m.phone) && contactEmail !== "";
    return true;
  };

  if (fetching) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!registrationsOpen) {
    return (
      <div className="pt-40 pb-24 px-6 flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-24 h-24 bg-red-500/10 border border-red-500/25 rounded-[32px] flex items-center justify-center mb-4"
        >
          <Lock className="w-10 h-10 text-accent-500" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
            Registrations <span className="text-accent-500">Closed</span>
          </h2>
          <p className="text-white/40 text-sm md:text-base max-w-md mx-auto leading-relaxed">
            The registration window for Hacktoberfest Dehradun 2026 has officially closed. We are no longer accepting new squad applications.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl w-full text-left space-y-4"
        >
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Already Registered?</h4>
          <p className="text-white/60 text-xs leading-relaxed">
            If your team was already registered, you can log in to access your designated hacker dashboard, view your team status, and upload submission protocols.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 py-4 bg-accent-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-accent-400 transition-all text-center font-bold"
            >
              Access Dashboard
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-4 bg-white/5 text-white border border-white/10 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white/10 transition-all text-center font-bold"
            >
              Return Home
            </button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[10px] uppercase tracking-widest text-white/45"
        >
          Event Schedule: 30-31 May, 2026
        </motion.p>
      </div>
    );
  }

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError("Login popup was blocked. Please allow popups or use a different browser.");
      } else {
        setError("Identity check failed. Please try logging in again.");
      }
    }
  };

  if (!user && step < 5) {
    return (
      <div className="pt-40 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8">
            <Lock className="w-8 h-8 text-accent-500" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tight mb-4 text-center">Authentication Required</h2>
        <p className="text-white/40 text-center max-w-sm mb-10 leading-relaxed">
          You need to be logged in to register your team for Hacktoberfest Dehradun 2026.
        </p>
        
        {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold uppercase tracking-widest">
                <AlertCircle className="w-4 h-4" /> {error}
            </div>
        )}

        <button 
          onClick={handleLogin}
          className="px-10 py-4 bg-accent-500 text-black font-black uppercase tracking-widest text-sm hover:bg-accent-400 transition-all rounded-full"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 max-w-6xl mx-auto">
      {/* Progress Bar */}
      {step < 5 && (
        <div className="flex gap-2 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                step >= i ? "bg-accent-500" : "bg-white/10"
              )} 
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div>
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-4">Select your <span className="text-accent-500 italic">Track</span></h2>
              <p className="text-white/40">The foundation of your hackathon project.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrack(t.id)}
                  className={cn(
                    "p-8 rounded-3xl border-2 text-left transition-all group",
                    (selectedTrack === t.id || selectedTrack === t.name)
                      ? "bg-accent-500/10 border-accent-500" 
                      : "bg-white/5 border-white/5 hover:border-white/20"
                  )}
                >
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{t.name || t.title}</h3>
                  <p className="text-white/40 text-xs line-clamp-2">{t.description}</p>
                  <div className="flex justify-end mt-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                      (selectedTrack === t.id || selectedTrack === t.name) ? "bg-accent-500 border-accent-500 text-black" : "border-white/20 text-transparent"
                    )}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button 
                disabled={!canGoNext()}
                onClick={() => setStep(2)}
                className="flex items-center gap-3 px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full disabled:opacity-30 transition-all hover:bg-accent-500 hover:text-white"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center gap-4">
                <button onClick={() => setStep(1)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">Pick a <span className="text-accent-500 italic">Challenge</span></h2>
                  <p className="text-white/40">Solving real-world problems in {currentTrackData?.name || currentTrackData?.title}.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {currentProblems.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProblem(p.id)}
                  className={cn(
                    "h-[520px] p-10 rounded-[40px] border-2 text-left transition-all flex flex-col items-start gap-8 cursor-pointer relative overflow-hidden group mb-4",
                    selectedProblem === p.id 
                      ? "bg-accent-500/10 border-accent-500 shadow-[0_0_50px_rgba(34,197,94,0.15)] scale-[1.02]" 
                      : "bg-white/5 border-white/5 hover:border-white/20 hover:scale-[1.01]"
                  )}
                >
                  <div className="flex items-start gap-5 w-full flex-shrink-0">
                    <div className={cn(
                        "mt-1.5 w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all",
                        selectedProblem === p.id ? "bg-accent-500 border-accent-500 text-black" : "border-white/20 text-transparent"
                      )}>
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-accent-500 leading-none flex-1 group-hover:tracking-normal transition-all">{p.title}</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-4 w-full custom-scrollbar">
                    <p className="text-white/80 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                      {p.description}
                    </p>
                  </div>

                  {selectedProblem === p.id && (
                      <motion.div 
                        layoutId="active-border"
                        className="absolute inset-0 border-[3px] border-accent-500 rounded-[40px] pointer-events-none"
                      />
                  )}
                </div>
              ))}
              {currentProblems.length === 0 && (
                  <div className="col-span-1 md:col-span-2 p-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                      <p className="text-white/45 uppercase tracking-widest font-bold">No problem statements added yet for this track.</p>
                  </div>
              )}
            </div>
            <div className="flex justify-end">
              <button 
                disabled={!canGoNext()}
                onClick={() => setStep(3)}
                className="flex items-center gap-3 px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full disabled:opacity-30 transition-all hover:bg-accent-500 hover:text-white"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center gap-4">
                <button onClick={() => setStep(2)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">Team <span className="text-accent-500 italic">Assembly</span></h2>
                  <p className="text-white/40">Register your squad (1-3 members).</p>
                </div>
            </div>

            <div className="space-y-10">
                <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 ml-1">Team Identity</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            type="text" 
                            placeholder="Team Name" 
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl focus:outline-none focus:border-accent-500 transition-colors font-bold text-xl uppercase tracking-tighter"
                        />
                        <input 
                            type="text" 
                            placeholder="Current City" 
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl focus:outline-none focus:border-accent-500 transition-colors font-bold text-xl uppercase tracking-tighter"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 ml-1">Member Rosters</label>
                        <button 
                            disabled={members.length >= 3}
                            onClick={addMember}
                            className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-accent-500 disabled:opacity-20 translate-y-2"
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Add Member
                        </button>
                    </div>
                    {members.map((member, i) => (
                        <div key={i} className="pt-6 border-t border-white/5 relative group space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-500/50 italic">
                                    {member.role === 'leader' ? "Team Leader (Member 1)" : `Team Member ${i+1}`}
                                </span>
                                {members.length > 1 && member.role !== 'leader' && (
                                    <button 
                                        onClick={() => removeMember(i)}
                                        className="p-2 text-white/45 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input 
                                    type="text"
                                    placeholder="Full Name"
                                    value={member.name}
                                    onChange={(e) => updateMember(i, "name", e.target.value)}
                                    className="bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 transition-colors text-sm font-medium"
                                />
                                <input 
                                    type="email"
                                    placeholder="Email Address"
                                    value={member.email}
                                    onChange={(e) => updateMember(i, "email", e.target.value)}
                                    className="bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 transition-colors text-sm font-medium"
                                />
                                <input 
                                    type="tel"
                                    placeholder="Phone Number"
                                    value={member.phone}
                                    onChange={(e) => updateMember(i, "phone", e.target.value)}
                                    className="bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 transition-colors text-sm font-medium md:col-span-2"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-4 pt-6 border-t border-white/10">
                    <label className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 ml-1">Primary Contact Email</label>
                    <input 
                        type="email" 
                        placeholder="Preferred contact email" 
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-5 rounded-xl focus:outline-none focus:border-accent-500 transition-colors text-sm font-medium"
                    />
                </div>
            </div>

            <div className="flex justify-end">
              <button 
                disabled={!canGoNext()}
                onClick={() => setStep(4)}
                className="flex items-center gap-3 px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full disabled:opacity-30 transition-all hover:bg-accent-500 hover:text-white"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center gap-4">
                <button onClick={() => setStep(3)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">Final <span className="text-accent-500 italic">Consent</span></h2>
                  <p className="text-white/40">Review the terms before deployment.</p>
                </div>
            </div>

            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                <div className="flex gap-4">
                    <AlertCircle className="w-6 h-6 text-accent-500 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Important Notice</h4>
                        <p className="text-white/50 text-sm leading-relaxed">
                            Hacktoberfest Dehradun 2026 is an <span className="text-white font-bold italic">in-person event</span>. If your team is selected from the initial screening, all members listed <span className="text-white font-bold italic">must attend</span> at the physical venue in Dehradun to build your solution.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5 text-sm text-white/50 leading-relaxed">
                    <p>• Expenses incurred on travel (if applicable) will NOT be compensated by the organizing company.</p>
                    <p>• Complimentary coffee, snacks, and meals will be provided during the 24+ hour hackathon duration.</p>
                </div>

                <label className="flex items-start gap-4 p-6 bg-black/40 rounded-2xl border border-white/5 cursor-pointer hover:border-accent-500/50 transition-all">
                    <input 
                        type="checkbox" 
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-1 w-5 h-5 accent-accent-500"
                    />
                    <span className="text-sm font-medium leading-relaxed">
                        I confirm that our team name <span className="text-white italic">"{teamName}"</span> understands the in-person requirement and all members agree to the terms mentioned above.
                    </span>
                </label>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            <div className="flex justify-end">
              <button 
                disabled={!consent || loading}
                onClick={handleSubmit}
                className="flex items-center gap-3 px-10 py-5 bg-accent-500 text-black font-black uppercase tracking-widest text-sm rounded-full disabled:opacity-30 transition-all hover:bg-accent-400 group"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Team"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div 
            key="step5"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-20 px-6 space-y-8"
          >
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-12 h-12 text-black" />
            </div>
            <h2 className="text-6xl font-black uppercase tracking-tighter italic">Application <span className="text-accent-500">Submitted!</span></h2>
            <p className="text-xl text-white/50 max-w-lg mx-auto leading-relaxed">
              Your team <span className="text-white font-bold">"{teamName}"</span> has been registered for Hacktoberfest Dehradun 2026. We will review your application and notify you via <span className="text-white italic">{contactEmail}</span>.
            </p>
            <div className="pt-10 flex justify-center gap-4">
                <button 
                  onClick={() => navigate("/")}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                    Return Home
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        input::placeholder {
            color: rgba(255,255,255,0.2);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-size: 0.7rem;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(34,197,94, 0.3);
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(34,197,94, 0.5);
        }
      `}</style>
    </div>
  );
}
