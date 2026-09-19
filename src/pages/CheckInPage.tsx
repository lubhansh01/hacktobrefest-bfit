import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Shield, CheckCircle, Clock, Users, ArrowLeft, Loader2, Award, MapPin } from "lucide-react";
import { cn } from "../lib/utils";

interface CheckInPageProps {
  user: any;
  isAdmin: boolean;
  isMentor: boolean;
}

export default function CheckInPage({ user, isAdmin, isMentor }: CheckInPageProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<any | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTeam = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const tracksSnap = await getDocs(collection(db, "tracks"));
      setTracks(tracksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const docSnap = await getDoc(doc(db, "teams", teamId));
      if (docSnap.exists()) {
        setTeam({ id: docSnap.id, ...docSnap.data() });
        setError(null);
      } else {
        setError("Invalid Pass: Team credential matching failed. This ticket does not exist in our systems.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Connection Failure: Unable to handshake with verification grid.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const handleCheckIn = async () => {
    if (!teamId || !team) return;
    setCheckingIn(true);
    setMessage(null);
    try {
      const staffEmail = auth.currentUser?.email || "Staff Operator";
      await updateDoc(doc(db, "teams", teamId), {
        checkedIn: true,
        checkedInAt: serverTimestamp(),
        checkedInBy: staffEmail
      });
      setMessage("ENTRY SECURED: Venue access successfully authorized.");
      // Reload team state
      const updatedSnap = await getDoc(doc(db, "teams", teamId));
      if (updatedSnap.exists()) {
        setTeam({ id: updatedSnap.id, ...updatedSnap.data() });
      }
    } catch (err: any) {
      console.error(err);
      setError("Authorization Blocked: Update permission rejected.");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Scanning Credentials...</p>
        </div>
      </div>
    );
  }

  const isStaff = isAdmin || isMentor;

  return (
    <div className="min-h-[85vh] bg-black text-white py-12 px-6 flex items-center justify-center font-sans">
      <div className="max-w-xl w-full bg-neutral-950/80 border border-white/10 rounded-[40px] p-10 relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[100px] pointer-events-none" />
        
        {/* Navigation Indicator / Back Home */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Platform Home
        </Link>

        {error ? (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic text-red-500">Security Alert</h2>
              <p className="text-white/40 text-xs font-semibold leading-relaxed mt-3 max-w-sm mx-auto">{error}</p>
            </div>
            <Link 
              to="/" 
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all inline-block border border-white/5"
            >
              Back to Fleet
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Status Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-white/5 bg-white/5">
                <Shield className="w-3 h-3 text-accent-500" /> Entrance Gate Verifier
              </div>
              
              <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none text-white">
                {team.name}
              </h2>
              <p className="text-xs text-white/40 uppercase tracking-widest font-black italic">
                SQUAD IDENT ID: {team.id.substring(0, 12).toUpperCase()}
              </p>

              {/* Admission Status Banner */}
              <div className="pt-2">
                {team.checkedIn ? (
                  <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-3xl space-y-2 text-center shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-green-400">Venue Entry Authorized</div>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Contactless Check-In Confirmed</p>
                  </div>
                ) : (
                  <div className="bg-accent-500/10 border border-accent-500/30 p-6 rounded-3xl space-y-2 text-center shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                    <Clock className="w-8 h-8 text-accent-400 mx-auto" />
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-accent-400">Admittance Pending</div>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Awaiting Staff Credentials Scanning</p>
                  </div>
                )}
              </div>
            </div>

            {/* Check-In Action Button (Staff Only) */}
            {isStaff && !team.checkedIn && (
              <div className="p-6 bg-accent-500/5 border border-accent-500/10 rounded-3xl space-y-4">
                <div className="text-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-500">
                    Command Authorization Required
                  </span>
                  <p className="text-[10px] text-white/30 font-medium leading-normal mt-1">
                    You have secure Gatekeeper clearance. Please check the identity of presenting participants before authorizing.
                  </p>
                </div>
                
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full py-4 bg-accent-500 hover:bg-accent-400 disabled:opacity-30 text-black font-black uppercase tracking-[0.20em] text-xs rounded-2xl transition-all shadow-[0_15px_30px_rgba(34,197,94,0.2)] active:scale-95 flex items-center justify-center gap-2"
                >
                  {checkingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {checkingIn ? "Authorizing Entry..." : "Confirm Gate Entry"}
                </button>
              </div>
            )}

            {/* If Staff scanned but already checked-in */}
            {isStaff && team.checkedIn && (
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-white/30">Verification Log</div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-[9px] text-white/45 uppercase font-bold tracking-widest">Operator Email</div>
                    <div className="font-semibold text-white mt-1 truncate max-w-[150px]">{team.checkedInBy || "Unknown Staff"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/45 uppercase font-bold tracking-widest">Verification Time</div>
                    <div className="font-semibold text-white mt-1">
                      {team.checkedInAt ? new Date(team.checkedInAt.seconds ? team.checkedInAt.seconds * 1000 : team.checkedInAt).toLocaleString() : "Syncing..."}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Details Block */}
            <div className="space-y-4 border-t border-white/5 pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Presenting Squaddies (Members)
              </h3>
              
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                {team.members && team.members.map((member: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-accent-500/10 text-accent-500 border border-accent-500/20 rounded-full flex items-center justify-center text-xs font-black uppercase">
                        {member.name ? member.name.substring(0, 1).toUpperCase() : "H"}
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-tight">{member.name || "Hacker"}</div>
                        <div className="text-[9px] text-white/30 font-medium">{member.email}</div>
                      </div>
                    </div>
                    <div>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-md",
                        member.role === "leader" ? "bg-accent-500/10 border-accent-500/20 text-accent-500" : "bg-white/5 border-white/5 text-white/30"
                      )}>
                        {member.role || "Member"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Logistics Grid */}
              <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl mt-4">
                <div className="space-y-1">
                  <div className="text-[9px] text-white/45 uppercase font-bold tracking-widest flex items-center gap-1">
                    <Award className="w-3 h-3 text-accent-500" /> Selected Track
                  </div>
                  <div className="text-xs font-black uppercase tracking-tight text-white italic truncate pr-2">
                    {(() => {
                      const track = tracks.find(t => t.id === team.trackId || t.name === team.trackId || t.title === team.trackId);
                      return track ? (track.name || track.title) : (team.trackId || "N/A");
                    })()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] text-white/45 uppercase font-bold tracking-widest flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent-500" /> Origin City
                  </div>
                  <div className="text-xs font-black uppercase tracking-tight text-accent-500 italic">
                    {team.city || "Dehradun, IN"}
                  </div>
                </div>
              </div>
            </div>

            {/* System Status / Instructions */}
            {message && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-[10px] uppercase font-black tracking-widest text-center">
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
