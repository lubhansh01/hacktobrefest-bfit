import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase, subscribe, subscribeRow, withId, handleDbError, OperationType } from "../lib/supabase";
import { 
  Users, 
  Layers, 
  FileText, 
  Clock, 
  Flag, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  Menu,
  Database,
  X,
  Loader2,
  Trophy,
  Medal,
  Star,
  UserCheck,
  ShieldCheck,
  Mail,
  AlertTriangle,
  Handshake,
  MapPin,
  Send,
  Zap,
  User,
  PenTool,
  QrCode,
  Lock,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import * as XLSX from 'xlsx';
import { Download, Filter } from "lucide-react";
import AttendanceManager from "../components/AttendanceManager";
import { api } from "../lib/api";

const getImageUrl = (url: string) => {
  if (!url) return "";
  const idMatch = url.match(/[-\w]{25,}/);
  if (url.includes('drive.google.com') && idMatch) {
    return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
  }
  return url;
};

export default function AdminPanel({ permissions }: { permissions: any }) {
  const [activeTab, setActiveTab] = useState("teams");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const tabFromPath = location.pathname.split("/").pop();
    if (tabFromPath && ["teams", "tracks", "problems", "timeline", "rounds", "mail", "elimination", "evaluation", "mentors", "speakers", "partners", "event-team", "location", "marketing", "guests", "attendance"].includes(tabFromPath)) {
      setActiveTab(tabFromPath);
    }
  }, [location]);

  const hasPerm = (perm: string) => {
    if (!permissions) return false;
    return permissions[perm] === true;
  };

  const anyPerm = permissions ? Object.values(permissions).some(v => v === true) : false;

  return (
    <div className="pt-20 min-h-screen flex bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-md hidden lg:flex flex-col">
        <div className="p-8 pb-4">
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-white/30 mb-8">Management Suite</p>
          <nav className="space-y-2">
            {(hasPerm('manage_teams') || hasPerm('view_teams')) && <SidebarLink to="/admin/teams" icon={Users} label="Registered Teams" active={activeTab === "teams"} />}
            {hasPerm('manage_location') && <SidebarLink to="/admin/location" icon={MapPin} label="Event Location" active={activeTab === "location"} />}
            {hasPerm('manage_tracks') && <SidebarLink to="/admin/tracks" icon={Layers} label="Hack Tracks" active={activeTab === "tracks"} />}
            {hasPerm('manage_tracks') && <SidebarLink to="/admin/problems" icon={FileText} label="Problem Statements" active={activeTab === "problems"} />}
            {hasPerm('manage_timeline') && <SidebarLink to="/admin/timeline" icon={Clock} label="Event Timeline" active={activeTab === "timeline"} />}
            {hasPerm('manage_rounds') && <SidebarLink to="/admin/rounds" icon={Flag} label="Hack Rounds" active={activeTab === "rounds"} />}
            {hasPerm('manage_event_team') && <SidebarLink to="/admin/event-team" icon={UserCheck} label="Event Team" active={activeTab === "event-team"} />}
            {hasPerm('manage_mentors') && <SidebarLink to="/admin/mentors" icon={Users} label="Mentor Squad" active={activeTab === "mentors"} />}
            {hasPerm('manage_speakers') && <SidebarLink to="/admin/speakers" icon={Star} label="Session Speakers" active={activeTab === "speakers"} />}
            {hasPerm('manage_guests') && <SidebarLink to="/admin/guests" icon={Medal} label="Honoured Guests" active={activeTab === "guests"} />}
            {hasPerm('manage_partners') && <SidebarLink to="/admin/partners" icon={Handshake} label="Strategic Partners" active={activeTab === "partners"} />}
            {hasPerm('manage_rounds') && <SidebarLink to="/admin/evaluation" icon={Star} label="Evaluations" active={activeTab === "evaluation"} />}
            {hasPerm('manage_rounds') && <SidebarLink to="/admin/elimination" icon={XCircle} label="Elimination Gate" active={activeTab === "elimination"} />}
            {(hasPerm('manage_event_team') || hasPerm('manage_teams')) && <SidebarLink to="/admin/mail" icon={Mail} label="Mail Room" active={activeTab === "mail"} />}
            {(hasPerm('manage_teams') || hasPerm('manage_attendance')) && <SidebarLink to="/admin/attendance" icon={QrCode} label="Attendance Gate" active={activeTab === "attendance"} />}
            {hasPerm('manage_email_marketing') && <SidebarLink to="/admin/marketing" icon={Send} label="Marketing Hub" active={activeTab === "marketing"} />}
          </nav>
          
          {!anyPerm && (
            <div className="mt-8 p-6 bg-red-400/5 border border-red-400/10 rounded-2xl">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle className="w-3 h-3" />
                <p className="text-[10px] font-black uppercase tracking-wider">Zero Clearance</p>
              </div>
              <p className="text-[11px] text-white/30 font-bold leading-relaxed">No specific modules have been authorized for your profile yet.</p>
            </div>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {/* Mobile Navigation Header */}
        <div className="lg:hidden mb-6">
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full p-4 bg-accent-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-between gap-3 shadow-[0_10px_30px_rgba(34,197,94,0.15)] active:scale-95 transition-all cursor-pointer select-none"
          >
            <span className="flex items-center gap-2">
              <Menu className="w-4 h-4" />
              {activeTab ? `Admin: ${activeTab.replace("-", " ")}` : "Select Admin Module"}
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", mobileMenuOpen ? "rotate-180" : "")} />
          </button>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2 bg-black border border-white/10 rounded-2xl p-4 space-y-1 z-30 relative"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30 mb-3 pl-2">Management Suite</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(hasPerm('manage_teams') || hasPerm('view_teams')) && (
                    <Link 
                      to="/admin/teams" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "teams" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Users className="w-4 h-4" />
                      <span>Registered Teams</span>
                    </Link>
                  )}
                  {hasPerm('manage_location') && (
                    <Link 
                      to="/admin/location" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "location" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Event Location</span>
                    </Link>
                  )}
                  {hasPerm('manage_tracks') && (
                    <Link 
                      to="/admin/tracks" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "tracks" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Hack Tracks</span>
                    </Link>
                  )}
                  {hasPerm('manage_tracks') && (
                    <Link 
                      to="/admin/problems" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "problems" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Problem Statements</span>
                    </Link>
                  )}
                  {hasPerm('manage_timeline') && (
                    <Link 
                      to="/admin/timeline" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "timeline" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Event Timeline</span>
                    </Link>
                  )}
                  {hasPerm('manage_rounds') && (
                    <Link 
                      to="/admin/rounds" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "rounds" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Flag className="w-4 h-4" />
                      <span>Hack Rounds</span>
                    </Link>
                  )}
                  {hasPerm('manage_event_team') && (
                    <Link 
                      to="/admin/event-team" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "event-team" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Event Team</span>
                    </Link>
                  )}
                  {hasPerm('manage_mentors') && (
                    <Link 
                      to="/admin/mentors" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "mentors" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Users className="w-4 h-4" />
                      <span>Mentor Squad</span>
                    </Link>
                  )}
                  {hasPerm('manage_speakers') && (
                    <Link 
                      to="/admin/speakers" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "speakers" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Star className="w-4 h-4" />
                      <span>Session Speakers</span>
                    </Link>
                  )}
                  {hasPerm('manage_guests') && (
                    <Link 
                      to="/admin/guests" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "guests" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Medal className="w-4 h-4" />
                      <span>Honoured Guests</span>
                    </Link>
                  )}
                  {hasPerm('manage_partners') && (
                    <Link 
                      to="/admin/partners" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "partners" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Handshake className="w-4 h-4" />
                      <span>Strategic Partners</span>
                    </Link>
                  )}
                  {hasPerm('manage_rounds') && (
                    <Link 
                      to="/admin/evaluation" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "evaluation" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Star className="w-4 h-4" />
                      <span>Evaluations</span>
                    </Link>
                  )}
                  {hasPerm('manage_rounds') && (
                    <Link 
                      to="/admin/elimination" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "elimination" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Elimination Gate</span>
                    </Link>
                  )}
                  {(hasPerm('manage_event_team') || hasPerm('manage_teams')) && (
                    <Link 
                      to="/admin/mail" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "mail" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Mail Room</span>
                    </Link>
                  )}
                  {(hasPerm('manage_teams') || hasPerm('manage_attendance')) && (
                    <Link 
                      to="/admin/attendance" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "attendance" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Attendance Gate</span>
                    </Link>
                  )}
                  {hasPerm('manage_email_marketing') && (
                    <Link 
                      to="/admin/marketing" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl text-xs uppercase tracking-widest transition-all",
                        activeTab === "marketing" ? "bg-accent-500 text-black font-bold" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Send className="w-4 h-4" />
                      <span>Marketing Hub</span>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Routes>
          <Route path="/" element={anyPerm ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-40">
              <ShieldCheck className="w-12 h-12 mb-6" />
              <h2 className="text-xl font-black uppercase italic tracking-widest italic">Authorized Session Active</h2>
              <p className="text-xs font-bold uppercase mt-2 tracking-widest">Select a protocol from the sidebar to begin</p>
            </div>
          ) : <div className="p-20 text-center uppercase tracking-[0.2em] font-black text-white/20 italic">Select an authorized module</div>} />
          <Route path="/location" element={hasPerm('manage_location') ? <LocationManager /> : <AccessDenied />} />
          <Route path="/teams" element={(hasPerm('manage_teams') || hasPerm('view_teams')) ? <TeamsManager canEdit={hasPerm('manage_teams')} /> : <AccessDenied />} />
          <Route path="/tracks" element={hasPerm('manage_tracks') ? <TracksManager /> : <AccessDenied />} />
          <Route path="/problems" element={hasPerm('manage_tracks') ? <ProblemsManager /> : <AccessDenied />} />
          <Route path="/timeline" element={hasPerm('manage_timeline') ? <TimelineManager /> : <AccessDenied />} />
          <Route path="/rounds" element={hasPerm('manage_rounds') ? <RoundsManager /> : <AccessDenied />} />
          <Route path="/event-team" element={hasPerm('manage_event_team') ? <EventTeamManager /> : <AccessDenied />} />
          <Route path="/mentors" element={hasPerm('manage_mentors') ? <MentorsManager /> : <AccessDenied />} />
          <Route path="/speakers" element={hasPerm('manage_speakers') ? <SpeakersManager /> : <AccessDenied />} />
          <Route path="/guests" element={hasPerm('manage_guests') ? <GuestManager /> : <AccessDenied />} />
          <Route path="/partners" element={hasPerm('manage_partners') ? <PartnersManager /> : <AccessDenied />} />
          <Route path="/evaluation" element={hasPerm('manage_rounds') ? <EvaluationManager /> : <AccessDenied />} />
          <Route path="/elimination" element={hasPerm('manage_rounds') ? <EliminationManager /> : <AccessDenied />} />
          <Route path="/mail" element={(hasPerm('manage_event_team') || hasPerm('manage_teams')) ? <MailManager /> : <AccessDenied />} />
          <Route path="/attendance" element={(hasPerm('manage_teams') || hasPerm('manage_attendance')) ? <AttendanceManager /> : <AccessDenied />} />
          <Route path="/marketing" element={hasPerm('manage_email_marketing') ? <MarketingManager /> : <AccessDenied />} />
        </Routes>
      </main>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-20">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <ShieldCheck className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">Access Protocol <span className="text-red-500">Violation</span></h2>
      <p className="text-white/40 mt-4 max-w-sm">You do not have the required clearance to access this module. Please contact the administrator for permissions.</p>
    </div>
  );
}

function SidebarLink({ to, icon: Icon, label, active }: any) {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center justify-between p-4 rounded-xl transition-all group",
        active ? "bg-accent-500 text-black font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "text-white/50 hover:bg-white/5 hover:text-white"
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

function MailManager() {
  const [teams, setTeams] = useState<any[]>([]);
  const [eventTeam, setEventTeam] = useState<any[]>([]);
  const [recipientMode, setRecipientMode] = useState<'system' | 'custom'>('system');
  const [systemCategory, setSystemCategory] = useState<'teams' | 'event_team'>('teams');
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");
  
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [includeQRTicket, setIncludeQRTicket] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: allTeams } = await supabase
          .from("teams").select("*").eq("status", "approved").order("name");
        setTeams(allTeams ?? []);

        const { data: eventRows } = await supabase
          .from("event_team").select("*").order("name");
        setEventTeam(withId(eventRows ?? []));
      } catch (err) {
        console.error("Failed to fetch mailing data", err);
        handleDbError(err, OperationType.LIST, "mailing_data_fetch");
      }
    };
    fetchData();
  }, []);

  const handleSend = async () => {
    if (!subject || !message) {
      setStatus("Error: Please provide both subject and message content.");
      return;
    }

    setSending(true);
    setStatus("Initiating transmission sequence...");

    try {
      if (recipientMode === 'system' && systemCategory === 'teams' && includeQRTicket) {
        if (selectedTargetId === "all") {
          let totalSentCount = 0;
          for (const t of teams) {
            const squadEmails = t.memberEmails && t.memberEmails.length > 0 
              ? t.memberEmails 
              : [t.contactEmail || t.creatorEmail].filter((e: any) => !!e);
            
            if (squadEmails.length === 0) continue;

            setStatus(`Processing dispatch for "${t.name}" squaddies...`);
            const response = await fetch(api("/api/send-team-tickets"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emails: squadEmails,
                teamId: t.id,
                teamName: t.name,
                subject,
                message
              })
            });
            const data = await response.json();
            if (data.success) {
              totalSentCount += squadEmails.length;
            }
          }
          setStatus(`SUCCESS: Admission passes deployed on ${totalSentCount} devices.`);
          setSubject("");
          setMessage("");
        } else if (selectedTargetId) {
          const target = teams.find(t => t.id === selectedTargetId);
          if (!target) {
            setStatus("Error: Selected team is unverified.");
            setSending(false);
            return;
          }

          const squadEmails = target.memberEmails && target.memberEmails.length > 0
            ? target.memberEmails
            : [target.contactEmail || target.creatorEmail].filter((e: any) => !!e);

          if (squadEmails.length === 0) {
            setStatus("Error: No member contacts found for this squad.");
            setSending(false);
            return;
          }

          setStatus(`Processing admission ticket dispatch...`);
          const response = await fetch(api("/api/send-team-tickets"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emails: squadEmails,
              teamId: target.id,
              teamName: target.name,
              subject,
              message
            })
          });
          const data = await response.json();
          if (data.success) {
            setStatus(`SUCCESS: Admission passes deployed on ${squadEmails.length} member devices.`);
            setSubject("");
            setMessage("");
          } else {
            setStatus("System Error: " + data.error);
          }
        }
      } else {
        let targetEmails: string[] = [];
        
        if (recipientMode === 'system') {
          if (selectedTargetId === "all") {
            if (systemCategory === 'teams') {
              targetEmails = teams.flatMap(t => t.memberEmails && t.memberEmails.length > 0 ? t.memberEmails : [t.contactEmail]).filter(e => !!e);
            } else {
              targetEmails = eventTeam.map(m => m.email).filter(e => !!e);
            }
          } else if (selectedTargetId) {
            const target = systemCategory === 'teams' 
              ? teams.find(t => t.id === selectedTargetId)
              : eventTeam.find(m => m.id === selectedTargetId);
            
            if (systemCategory === 'teams' && target) {
              targetEmails = target.memberEmails && target.memberEmails.length > 0
                ? target.memberEmails
                : [target.contactEmail].filter((e: any) => !!e);
            } else if (target) {
              const email = target.email;
              if (email) targetEmails = [email];
            }
          }
        } else {
          if (customEmail) targetEmails = [customEmail.trim().toLowerCase()];
        }

        if (targetEmails.length === 0) {
          setStatus("Error: No valid recipient identified.");
          setSending(false);
          return;
        }

        const response = await fetch(api("/api/send-bulk-update"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: targetEmails, subject, message })
        });
        
        const data = await response.json();
        if (data.success) {
          setStatus(`SUCCESS: Newsletter signal received by ${data.results.length} targets.`);
          setSubject("");
          setMessage("");
          if (recipientMode === 'custom') {
            setCustomName("");
            setCustomEmail("");
          }
        } else {
          setStatus("System Error: " + data.error);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Critical Failure: Signals lost during uplink.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Mail <span className="text-white/20">Room</span></h2>
        <p className="text-white/40 text-sm mt-2">Precision dispatch system for event communications.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[40px] p-1.5 flex gap-1.5 w-fit">
        <button 
          onClick={() => setRecipientMode('system')}
          className={cn(
            "px-6 py-3 rounded-[32px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            recipientMode === 'system' ? "bg-white text-black font-black" : "text-white/30 hover:text-white"
          )}
        >
          <Database className="w-3 h-3" /> System Contacts
        </button>
        <button 
          onClick={() => setRecipientMode('custom')}
          className={cn(
            "px-6 py-3 rounded-[32px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            recipientMode === 'custom' ? "bg-white text-black font-black" : "text-white/30 hover:text-white"
          )}
        >
          <PenTool className="w-3 h-3" /> Custom Dispatch
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 space-y-8">
        
        {recipientMode === 'system' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[11px] uppercase font-black tracking-[0.2em] text-white/30 ml-1">Source Category</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSystemCategory('teams'); setSelectedTargetId(""); setRecipientSearchQuery(""); setIsSelectOpen(false); }}
                  className={cn(
                    "flex-1 p-4 rounded-2xl border transition-all text-left group",
                    systemCategory === 'teams' ? "bg-accent-500/10 border-accent-500 text-accent-500 shadow-[0_10px_30px_rgba(34,197,94,0.1)]" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Users className="w-5 h-5 mb-2 opacity-50 group-hover:opacity-100" />
                  <div className="text-xs font-black uppercase tracking-tighter italic">Squads (Teams)</div>
                  <div className="text-[11px] opacity-40 font-bold uppercase tracking-widest mt-1">{teams.length} Qualified</div>
                </button>
                <button 
                  onClick={() => { setSystemCategory('event_team'); setSelectedTargetId(""); setRecipientSearchQuery(""); setIsSelectOpen(false); }}
                  className={cn(
                    "flex-1 p-4 rounded-2xl border transition-all text-left group",
                    systemCategory === 'event_team' ? "bg-info-500/10 border-info-500 text-info-500 shadow-[0_10px_30px_rgba(59,130,246,0.1)]" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <UserCheck className="w-5 h-5 mb-2 opacity-50 group-hover:opacity-100" />
                  <div className="text-xs font-black uppercase tracking-tighter italic">Event Team</div>
                  <div className="text-[11px] opacity-40 font-bold uppercase tracking-widest mt-1">{eventTeam.length} Members</div>
                </button>
              </div>
            </div>

            <div className="space-y-3 relative">
              <label className="text-[11px] uppercase font-black tracking-[0.2em] text-white/30 ml-1">Select Target Recipient</label>
              
              {isSelectOpen && (
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => {
                    setIsSelectOpen(false);
                    setRecipientSearchQuery("");
                  }} 
                />
              )}

              <div className="relative z-50">
                <button
                  type="button"
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-white hover:border-white/20 transition-all text-sm font-bold text-white flex justify-between items-center text-left"
                >
                  <span className="truncate">
                    {(() => {
                      if (!selectedTargetId) return "Choose a recipient...";
                      if (selectedTargetId === "all") {
                        return `BROADCAST TO ALL ${systemCategory === 'teams' ? 'SQUADS' : 'MEMBERS'}`;
                      }
                      if (systemCategory === 'teams') {
                        const t = teams.find(team => team.id === selectedTargetId);
                        return t ? `${t.name} (${t.contactEmail})` : "Choose a recipient...";
                      } else {
                        const m = eventTeam.find(member => member.id === selectedTargetId);
                        return m ? `${m.name} (${m.email})` : "Choose a recipient...";
                      }
                    })()}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform shrink-0 ml-2", isSelectOpen && "rotate-180 text-white")} />
                </button>

                {isSelectOpen && (
                  <div className="absolute right-0 left-0 mt-2 bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[380px] w-full z-50">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/40">
                      <Search className="w-4 h-4 text-white/30 shrink-0" />
                      <input
                        type="text"
                        placeholder={`Search ${systemCategory === 'teams' ? 'squads' : 'members'} by name or email...`}
                        value={recipientSearchQuery}
                        onChange={(e) => setRecipientSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-white/20"
                        autoFocus
                      />
                      {recipientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setRecipientSearchQuery("")}
                          className="p-1 hover:bg-white/10 rounded-full transition-all"
                        >
                          <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto max-h-[300px] no-scrollbar">
                      {!recipientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTargetId("");
                            setIsSelectOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-5 py-3.5 hover:bg-white/5 transition-all text-sm border-b border-white/[0.02]",
                            selectedTargetId === "" ? "text-accent-500 bg-accent-500/5 font-black" : "text-white/40"
                          )}
                        >
                          Choose a recipient...
                        </button>
                      )}

                      {(!recipientSearchQuery || "all".includes(recipientSearchQuery.toLowerCase()) || "broadcast".includes(recipientSearchQuery.toLowerCase())) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTargetId("all");
                            setIsSelectOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-5 py-3.5 hover:bg-white/5 transition-all text-sm font-bold border-b border-white/[0.02] flex items-center justify-between",
                            selectedTargetId === "all" ? "text-accent-500 bg-accent-500/5 font-black" : "text-white"
                          )}
                        >
                          <span>BROADCAST TO ALL {systemCategory === 'teams' ? 'SQUADS' : 'MEMBERS'}</span>
                          {selectedTargetId === "all" && <CheckCircle className="w-4 h-4 text-accent-500 shrink-0 ml-2" />}
                        </button>
                      )}

                      {(() => {
                        const matches = systemCategory === 'teams' 
                          ? teams.filter(t => 
                              t.name?.toLowerCase().includes(recipientSearchQuery.toLowerCase()) || 
                              t.contactEmail?.toLowerCase().includes(recipientSearchQuery.toLowerCase())
                            )
                          : eventTeam.filter(m => 
                              m.name?.toLowerCase().includes(recipientSearchQuery.toLowerCase()) || 
                              m.email?.toLowerCase().includes(recipientSearchQuery.toLowerCase())
                            );

                        if (matches.length === 0) {
                          return (
                            <div className="p-8 text-center text-xs text-white/30 uppercase tracking-widest font-black italic">
                              No matching recipients found
                            </div>
                          );
                        }

                        return matches.map(item => {
                          const id = item.id;
                          const name = item.name;
                          const email = systemCategory === 'teams' ? item.contactEmail : item.email;
                          const isSelected = selectedTargetId === id;

                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setSelectedTargetId(id);
                                setRecipientSearchQuery("");
                                setIsSelectOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-5 py-3.5 hover:bg-white/5 transition-all text-sm flex justify-between items-center border-b border-white/[0.02]",
                                isSelected ? "text-accent-500 bg-accent-500/5 font-black" : "text-white"
                              )}
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="font-extrabold tracking-tight truncate">{name}</span>
                                <span className="text-white/40 text-xs font-medium truncate font-mono">{email}</span>
                              </div>
                              {isSelected && <CheckCircle className="w-4 h-4 text-accent-500 shrink-0 ml-2" />}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest ml-1 italic">Selecting a target locks in the communication pipe</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-black/40 border border-white/10 rounded-[32px]">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest font-black text-white/30 ml-1">Recipient Name</label>
              <input 
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-xl focus:border-white outline-none transition-all text-sm font-bold text-white placeholder:text-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest font-black text-white/30 ml-1">Recipient Email</label>
              <input 
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="target@external.com"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-xl focus:border-white outline-none transition-all text-sm font-bold text-white placeholder:text-white/10"
              />
            </div>
          </div>
        )}

        <div className="space-y-6 pt-4 border-t border-white/5">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest font-black text-white/30 ml-1">Email Subject</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Enter transmission subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl focus:border-white outline-none transition-all text-sm font-black uppercase tracking-tight italic text-white placeholder:text-white/5"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 text-white">
                <Send className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between items-center px-1">
                <label className="text-[11px] uppercase tracking-widest font-black text-white/30">Message Content</label>
                <span className="text-[9px] font-black uppercase text-white/10 tracking-[0.3em]">HTML Payload Enabled</span>
             </div>
            <textarea 
              placeholder="Construct your broadcast message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-black/40 border border-white/10 p-6 rounded-[32px] focus:border-white outline-none transition-all text-sm min-h-[350px] font-medium leading-relaxed text-white/90"
            />
          </div>

          {systemCategory === 'teams' && recipientMode === 'system' && (
            <div className="p-6 bg-accent-500/5 border border-accent-500/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-accent-500" /> Convert to Admission Ticket Passes
                </div>
                <p className="text-[11px] text-white/40 font-medium leading-relaxed uppercase tracking-wider">
                  If enabled, each team's members will receive their official digital check-in passes alongside your custom message.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeQRTicket} 
                  onChange={(e) => setIncludeQRTicket(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-white/15 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
              </label>
            </div>
          )}

          {status && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
              "p-6 rounded-2xl text-[11px] font-black uppercase tracking-widest border flex items-center gap-4",
              String(status).includes("Error") || String(status).includes("Failure")
                ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.1)]" 
                : "bg-accent-500/10 border-accent-500/20 text-accent-500 shadow-[0_0_40px_rgba(34,197,94,0.1)]"
            )}>
              <div className={cn("w-2 h-2 rounded-full animate-pulse", String(status).includes("Error") ? "bg-red-500" : "bg-accent-500")} />
              {status}
            </motion.div>
          )}

          <button 
            onClick={handleSend}
            disabled={sending || (recipientMode === 'system' && !selectedTargetId)}
            className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-[12px] rounded-[24px] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-10 transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-current" />
            )}
            {sending ? "Initiating Uplink..." : (recipientMode === 'system' && selectedTargetId === 'all' ? "Broadcast to System" : "Dispatch Transmission")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-components for Admin
function TeamsManager({ canEdit = true }: { canEdit?: boolean }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'disapproved' | 'pending'>('all');
  const [tracks, setTracks] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [togglingRegistration, setTogglingRegistration] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    contactEmail: "",
    trackId: "",
    problemId: "",
    city: "",
    members: [{ name: "", email: "", phone: "", role: "Leader" }]
  });

  const addMemberField = () => {
    setNewTeam({
      ...newTeam,
      members: [...newTeam.members, { name: "", email: "", phone: "", role: "Member" }]
    });
  };

  const removeMemberField = (index: number) => {
    const updatedMembers = [...newTeam.members];
    updatedMembers.splice(index, 1);
    setNewTeam({ ...newTeam, members: updatedMembers });
  };

  const updateMemberField = (index: number, field: string, value: string) => {
    const updatedMembers = [...newTeam.members];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setNewTeam({ ...newTeam, members: updatedMembers });
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name || !newTeam.contactEmail || !newTeam.trackId || !newTeam.problemId) return;

    try {
      const memberEmails = newTeam.members.map(m => m.email.toLowerCase().trim()).filter(e => !!e);
      const { data: session } = await supabase.auth.getSession();

      const teamData = {
        ...newTeam,
        creatorUid: session.session?.user.id ?? null,
        status: 'approved',
        currentRoundOrder: 1,
        isEliminated: false,
        memberEmails,
      };

      const { error: insertErr } = await supabase.from("teams").insert(teamData);
      if (insertErr) throw insertErr;

      // Trigger status update email to ALL members
      fetch(api("/api/send-status-update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: memberEmails.length > 0 ? memberEmails : [newTeam.contactEmail],
          teamName: newTeam.name,
          status: 'approved'
        })
      }).catch(err => console.error("Manual team approval email failed:", err));

      setIsAddingTeam(false);
      setNewTeam({
        name: "",
        contactEmail: "",
        trackId: "",
        problemId: "",
        city: "",
        members: [{ name: "", email: "", phone: "", role: "Leader" }]
      });
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "teams");
    }
  };

  useEffect(() => {
    const unsubTracks = subscribe("tracks", (snapshot) => {
      setTracks(snapshot);
    }, {}, (err) => handleDbError(err, OperationType.GET, "tracks"));
    const unsubProblems = subscribe("problems", (snapshot) => {
      setProblems(snapshot);
    }, {}, (err) => handleDbError(err, OperationType.GET, "problems"));

    const unsubTeams = subscribe("teams", (snapshot) => {
      setTeams(snapshot);
      setLoading(false);
    }, { orderBy: { column: "createdAt", ascending: false } },
       (err) => handleDbError(err, OperationType.LIST, "teams"));

    const unsubReg = subscribeRow<{ data?: { open?: boolean } }>(
      "config", "registration", (row) => setRegistrationOpen(!!row?.data?.open));

    return () => {
      unsubTracks();
      unsubProblems();
      unsubTeams();
      unsubReg();
    };
  }, []);

  const toggleRegistration = async () => {
    if (!canEdit) return;
    setTogglingRegistration(true);
    try {
      const { error } = await supabase.from("config").upsert({
        id: "registration",
        data: { open: !registrationOpen },
        updatedAt: new Date().toISOString()
      });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to update registration state:", err);
    } finally {
      setTogglingRegistration(false);
    }
  };

  const updateStatus = async (id: string, status: string, team: any) => {
    if (!canEdit) return;
    try {
      const updates: any = { status };
      // Initialize transformation if approved for the first time
      if (status === 'approved' && (!team.currentRoundOrder || team.currentRoundOrder === 0)) {
        updates.currentRoundOrder = 1;
        updates.isEliminated = false;
      }
      
      await supabase.from("teams").update(updates).eq("id", id);

      // Trigger status update email if approved or disapproved to ALL members
      if (status === 'approved' || status === 'disapproved') {
        fetch(api("/api/send-status-update"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: team.memberEmails || [team.contactEmail],
            teamName: team.name,
            status: status
          })
        }).catch(err => console.error("Status email trigger failed:", err));
      }
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `teams/${id}`);
    }
  };

  const removeTeam = async (id: string) => {
    if (!canEdit) return;
    try {
      const team = teams.find(t => t.id === id);
      if (team?.assignedMentorId) {
        await supabase.rpc("mentor_remove_team", {
          p_email: team.assignedMentorId,
          p_team: id,
        });
      }
      await supabase.from("teams").delete().eq("id", id);
      setDeletingId(null);
    } catch (err) {
      handleDbError(err, OperationType.DELETE, `teams/${id}`);
    }
  };

  const getTrackName = (id: string) => {
    const track = tracks.find(t => t.id === id || t.name === id);
    return track ? (track.name || track.title) : id;
  };
  const getProblemTitle = (id: string) => {
    const problem = problems.find(p => p.id === id || p.title === id);
    return problem ? (problem.title || problem.description) : id;
  };

  const exportToExcel = () => {
    const data: any[] = [];
    teams.forEach(team => {
      if (team.members && team.members.length > 0) {
        team.members.forEach((member: any) => {
          data.push({
            'Team Name': team.name,
            'Status': (team.status || 'pending').toUpperCase(),
            'Track': getTrackName(team.trackId),
            'Problem': getProblemTitle(team.problemId),
            'City': team.city || 'N/A',
            'Participant Name': member.name,
            'Participant Email': member.email,
            'Participant Phone': member.phone,
            'Participant Role': member.role || 'Member',
            'Primary Contact Email': team.contactEmail,
            'Registration Date': team.createdAt?.toDate ? team.createdAt.toDate().toLocaleString() : 'N/A'
          });
        });
      } else {
        data.push({
          'Team Name': team.name,
          'Status': (team.status || 'pending').toUpperCase(),
          'Track': getTrackName(team.trackId),
          'Problem': getProblemTitle(team.problemId),
          'City': team.city || 'N/A',
          'Participant Name': 'N/A',
          'Participant Email': 'N/A',
          'Participant Phone': 'N/A',
          'Participant Role': 'N/A',
          'Primary Contact Email': team.contactEmail,
          'Registration Date': team.createdAt?.toDate ? team.createdAt.toDate().toLocaleString() : 'N/A'
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teams Data");
    
    // Auto-size columns
    worksheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 25 }];

    XLSX.writeFile(workbook, `Hacktoberfest_Dehradun_Teams_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredTeams = teams.filter(team => {
    if (statusFilter === 'all') return true;
    return team.status === statusFilter;
  });

  const totalParticipants = teams.reduce((acc, team) => acc + (team.members?.length || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic">Teams <span className="text-white/20">{canEdit ? 'Audit' : 'Viewer'}</span></h2>
          <p className="text-white/40 text-sm mt-2">{canEdit ? 'Approve or reject applications for Hacktoberfest Dehradun.' : 'View all registered applications (Read Only Mode).'}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={exportToExcel}
            className="group relative flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-full hover:bg-accent-500 hover:border-accent-500 transition-all shadow-xl"
            title="Export to Excel"
          >
            <Download className="w-5 h-5 text-white/50 group-hover:text-black" />
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-black border border-white/10 rounded-md text-[9px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
              Export Database
            </div>
          </button>

          {canEdit && (
            <button 
              onClick={() => setIsAddingTeam(true)}
              className="bg-accent-500 text-black px-6 py-2.5 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center gap-2 hover:bg-accent-400 transition-all shadow-[0_10px_30px_rgba(34,197,94,0.2)]"
            >
              <Plus className="w-3.5 h-3.5" /> Induct Team
            </button>
          )}
          <div className="flex gap-4">
            <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 text-[11px] font-bold uppercase tracking-widest text-white/60">
                {teams.length} Teams
            </div>
            <div className="bg-accent-500/10 px-4 py-2 rounded-full border border-accent-500/20 text-[11px] font-bold uppercase tracking-widest text-accent-500">
                {totalParticipants} Participants
            </div>
          </div>
        </div>
      </div>

      {/* Registration Status Banner/Control */}
      <div className="bg-gradient-to-r from-zinc-950 via-neutral-900 to-zinc-950 border border-white/5 rounded-[32px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors",
            registrationOpen 
              ? "bg-green-500/10 border-green-500/20 text-green-400" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Registration Portal Control</h4>
            <p className="text-[11px] text-white/40 mt-1 uppercase tracking-wider font-semibold flex items-center gap-2">
              Status: {registrationOpen ? (
                <span className="text-green-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> OPEN & RECEIVING ENTRIES</span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> CLOSED & LOCKED</span>
              )}
            </p>
          </div>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 hidden md:inline">
              Toggle Portal State
            </span>
            <button
              onClick={toggleRegistration}
              disabled={togglingRegistration}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer select-none",
                registrationOpen 
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_10px_20px_rgba(220,38,38,0.2)]" 
                  : "bg-green-600 hover:bg-green-500 text-white shadow-[0_10px_20px_rgba(22,163,74,0.2)]"
              )}
            >
              {togglingRegistration ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : registrationOpen ? (
                "Close Registrations"
              ) : (
                "Open Registrations"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Filter and Stats Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2 bg-white/[0.03] border border-white/5 rounded-[32px]">
        <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-3xl w-full md:w-fit">
          <button 
            onClick={() => setStatusFilter('all')}
            className={cn(
              "flex-1 md:flex-none px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
              statusFilter === 'all' ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white"
            )}
          >
            All Protocols
          </button>
          <button 
            onClick={() => setStatusFilter('pending')}
            className={cn(
              "flex-1 md:flex-none px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              statusFilter === 'pending' ? "bg-accent-500 text-black shadow-lg" : "text-accent-500/40 hover:text-accent-500"
            )}
          >
            <Clock className="w-3 h-3" /> Pending
          </button>
          <button 
            onClick={() => setStatusFilter('approved')}
            className={cn(
              "flex-1 md:flex-none px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              statusFilter === 'approved' ? "bg-green-500 text-black shadow-lg" : "text-green-500/40 hover:text-green-500"
            )}
          >
            <CheckCircle className="w-3 h-3" /> Approved
          </button>
          <button 
            onClick={() => setStatusFilter('disapproved')}
            className={cn(
              "flex-1 md:flex-none px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              statusFilter === 'disapproved' ? "bg-red-500 text-black shadow-lg" : "text-red-500/40 hover:text-red-500"
            )}
          >
            <XCircle className="w-3 h-3" /> Rejected
          </button>
        </div>

        <div className="flex items-center gap-12 px-8">
           <div className="flex flex-col items-center">
              <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Active Batches</span>
              <span className="text-xl font-black text-white italic">{filteredTeams.length}</span>
           </div>
           <div className="h-8 w-px bg-white/5" />
           <div className="flex flex-col items-center">
              <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Human Assets</span>
              <span className="text-xl font-black text-accent-500 italic">{filteredTeams.reduce((acc, t) => acc + (t.members?.length || 0), 0)}</span>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddingTeam && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#111] border border-white/10 p-10 rounded-[40px] max-w-4xl w-full my-auto shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative"
            >
              <button 
                onClick={() => setIsAddingTeam(false)}
                className="absolute top-8 right-8 p-3 bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white transition-all hover:rotate-90"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-accent-500/10 border border-accent-500/20 rounded-2xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-accent-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">Manual Team <span className="text-accent-500">Induction</span></h3>
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/20 mt-2">Initialize squad with immediate status approval</p>
                </div>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-10">
                {/* Team Primary Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Squad Name</label>
                    <input 
                      required
                      placeholder="e.g. CyberX" 
                      value={newTeam.name} 
                      onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Primary Contact Email</label>
                    <input 
                      required
                      type="email"
                      placeholder="leader@example.com" 
                      value={newTeam.contactEmail} 
                      onChange={e => setNewTeam({...newTeam, contactEmail: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Hack Track</label>
                    <select 
                      required
                      value={newTeam.trackId}
                      onChange={e => setNewTeam({...newTeam, trackId: e.target.value, problemId: ""})}
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white/70"
                    >
                      <option value="">Select Domain</option>
                      {tracks.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Problem Statement</label>
                    <select 
                      required
                      value={newTeam.problemId}
                      onChange={e => setNewTeam({...newTeam, problemId: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white/70"
                    >
                      <option value="">Select Protocol</option>
                      {problems.filter(p => p.trackId === newTeam.trackId).map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Origin City</label>
                    <input 
                      placeholder="e.g. Dehradun, Uttarakhand" 
                      value={newTeam.city} 
                      onChange={e => setNewTeam({...newTeam, city: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
                    />
                  </div>
                </div>

                {/* Team Members Section */}
                <div className="space-y-6 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-accent-500 rounded-full" />
                      <p className="text-[13px] font-black uppercase tracking-[0.2em] text-accent-500">Squad Members</p>
                    </div>
                    <button 
                      type="button"
                      onClick={addMemberField}
                      className="text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-accent-500 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Participant
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 no-scrollbar">
                    {newTeam.members.map((member, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white/5 rounded-3xl border border-white/5 relative group/member"
                      >
                        {index > 0 && (
                          <button 
                            type="button"
                            onClick={() => removeMemberField(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover/member:opacity-100 transition-all shadow-xl"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">Full name</label>
                          <input 
                            required
                            placeholder="Name" 
                            value={member.name}
                            onChange={e => updateMemberField(index, 'name', e.target.value)}
                            className="w-full bg-black/40 border border-white/5 p-3 rounded-xl outline-none text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">Email</label>
                          <input 
                            required
                            type="email"
                            placeholder="Email" 
                            value={member.email}
                            onChange={e => updateMemberField(index, 'email', e.target.value)}
                            className="w-full bg-black/40 border border-white/5 p-3 rounded-xl outline-none text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">Phone</label>
                          <input 
                            required
                            placeholder="Phone" 
                            value={member.phone}
                            onChange={e => updateMemberField(index, 'phone', e.target.value)}
                            className="w-full bg-black/40 border border-white/5 p-3 rounded-xl outline-none text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2">Role</label>
                          <select 
                            value={member.role}
                            onChange={e => updateMemberField(index, 'role', e.target.value)}
                            className="w-full bg-black/40 border border-white/5 p-3 rounded-xl outline-none text-xs font-bold text-white/50"
                          >
                            <option value="Leader">Leader</option>
                            <option value="Member">Member</option>
                            <option value="Designer">Designer</option>
                            <option value="Developer">Developer</option>
                          </select>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-10 border-t border-white/5">
                   <button 
                    type="submit"
                    className="flex-1 py-5 bg-accent-500 text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-accent-400 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.3)]"
                  >
                    Deploy Squad Induction
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingTeam(false)}
                    className="px-10 py-5 bg-white/5 text-white/40 border border-white/10 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                  >
                    Abort
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {filteredTeams.map(team => (
          <div key={team.id} className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col justify-between gap-8 hover:bg-white/[0.07] transition-all relative group">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-3xl font-black uppercase tracking-tight italic text-accent-500">{team.name}</h3>
                    <span className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest",
                    team.status === 'approved' ? "bg-green-500/20 text-green-400" :
                    team.status === 'disapproved' ? "bg-red-500/20 text-red-400" : "bg-accent-500/20 text-accent-400"
                    )}>
                    {team.status}
                    </span>
                    {!canEdit && <span className="text-[9px] font-black uppercase text-white/20 border border-white/10 px-2 py-0.5 rounded">Vault Mode</span>}
                </div>
                {canEdit && (
                  deletingId === team.id ? (
                      <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded-lg border border-red-500/20">
                          <button onClick={() => removeTeam(team.id)} className="text-[10px] bg-red-500 text-white px-3 py-1.5 rounded font-black uppercase tracking-widest">Confirm Delete</button>
                          <button onClick={() => setDeletingId(null)} className="text-[10px] text-white/40 px-2 font-bold uppercase">Cancel</button>
                      </div>
                  ) : (
                      <button onClick={() => setDeletingId(team.id)} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                      </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] font-black text-white/20">Track Selection</p>
                  <p className="text-white font-bold uppercase tracking-tight">{getTrackName(team.trackId)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] font-black text-white/20">Problem Statement</p>
                  <p className="text-white font-bold uppercase tracking-tight text-sm line-clamp-1 italic">{getProblemTitle(team.problemId)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] font-black text-white/20">Current City</p>
                  <p className="text-white font-bold uppercase tracking-tight italic text-accent-500/80">{team.city || 'NOT SPECIFIED'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] font-black text-white/20">Team Composition</p>
                  <p className="text-white font-bold uppercase tracking-tight">{team.members?.length || 0} Members</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.2em] font-black text-white/20">Participant Details</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {team.members?.map((m: any, i: number) => (
                        <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black uppercase tracking-tight">{m.name}</p>
                                <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/30 font-bold uppercase tracking-widest">{m.role || 'MEMBER'}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] text-white/40 font-medium truncate">{m.email}</p>
                                <p className="text-[11px] text-accent-500/70 font-black tracking-widest">{m.phone || 'NO PHONE'}</p>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                <button 
                  onClick={() => updateStatus(team.id, 'approved', team)}
                  className="flex-1 py-4 bg-green-500/10 text-green-500 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-green-500 hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Grant Admission
                </button>
                <button 
                  onClick={() => updateStatus(team.id, 'disapproved', team)}
                  className="flex-1 py-4 bg-red-500/10 text-red-500 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-red-500 hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Deny Access
                </button>
                <button 
                  onClick={() => updateStatus(team.id, 'pending', team)}
                  className="px-6 py-4 bg-white/5 text-white/20 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TracksManager() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [newTrack, setNewTrack] = useState({ name: "", description: "" });
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    return subscribe("tracks", (snapshot) => {
      setTracks(snapshot);
    }, {}, (err) => handleDbError(err, OperationType.GET, "tracks"));
  }, []);

  const addTrack = async () => {
    if (!newTrack.name) return;
    try {
      await supabase.from("tracks").insert(newTrack);
      setNewTrack({ name: "", description: "" });
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "tracks");
    }
  };

  const updateTrack = async () => {
    if (!editingTrack || !editingTrack.name) return;
    try {
      await supabase.from("tracks").update({
        name: editingTrack.name,
        description: editingTrack.description
      }).eq("id", editingTrack.id);
      setEditingTrack(null);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `tracks/${editingTrack.id}`);
    }
  };

  const removeTrack = async (id: string) => {
    try {
      await supabase.from("tracks").delete().eq("id", id);
      setDeletingId(null);
    } catch (err) {
      handleDbError(err, OperationType.DELETE, `tracks/${id}`);
    }
  };

  const seedData = async () => {
      const defaultTracks = [
        { name: "EdTech", description: "AI in education" },
        { name: "Healthcare", description: "AI in health" },
        { name: "On-Demand Local Services", description: "AI for local economy" }
      ];
      for (const t of defaultTracks) {
          await supabase.from("tracks").insert(t);
      }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic">Track <span className="text-white/20">Control</span></h2>
          <p className="text-white/40 text-sm mt-2">Manage the main domains for the hackathon.</p>
        </div>
        <button onClick={seedData} className="px-4 py-2 border border-info-500/30 text-info-400 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-info-500 hover:text-black transition-all">
            <Database className="w-3.5 h-3.5" /> Seed Defaults
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-4 relative overflow-hidden">
        {editingTrack && (
          <div className="absolute inset-0 bg-accent-500/5 pointer-events-none border-b-2 border-accent-500" />
        )}
        <div className="flex-1 flex flex-col md:flex-row gap-4 relative z-10">
          <input 
            type="text" 
            placeholder="Track Name" 
            value={(editingTrack ? editingTrack.name : newTrack.name) || ""}
            onChange={(e) => editingTrack 
              ? setEditingTrack({...editingTrack, name: e.target.value})
              : setNewTrack({...newTrack, name: e.target.value})
            }
            className="flex-1 bg-black/40 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 text-sm"
          />
          <input 
            type="text" 
            placeholder="Description" 
            value={(editingTrack ? editingTrack.description : newTrack.description) || ""}
            onChange={(e) => editingTrack
              ? setEditingTrack({...editingTrack, description: e.target.value})
              : setNewTrack({...newTrack, description: e.target.value})
            }
            className="flex-1 bg-black/40 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 text-sm"
          />
        </div>
        <div className="flex gap-2 relative z-10">
          {editingTrack ? (
            <>
              <button onClick={updateTrack} className="bg-accent-500 text-black px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-accent-400 transition-all uppercase text-xs tracking-widest flex-1 justify-center">
                Save
              </button>
              <button onClick={() => setEditingTrack(null)} className="bg-white/10 text-white p-4 rounded-xl hover:bg-white/20 transition-all">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button onClick={addTrack} className="bg-accent-500 text-black px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-accent-400 transition-all uppercase text-xs tracking-widest flex-1 justify-center">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tracks.map(t => (
          <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex justify-between items-center group">
            <div>
              <h4 className="font-black uppercase tracking-tight text-xl">{t.name}</h4>
              <p className="text-white/40 text-[11px] uppercase tracking-widest mt-1">{t.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {deletingId === t.id ? (
                <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded-lg">
                  <button onClick={() => removeTrack(t.id)} className="text-[11px] bg-red-500 text-white px-3 py-1.5 rounded-md font-bold uppercase tracking-widest">
                    Confirm
                  </button>
                  <button onClick={() => setDeletingId(null)} className="text-[11px] text-white/40 hover:text-white px-2 font-bold uppercase tracking-widest">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setEditingTrack(t);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="p-2 text-white/20 hover:text-accent-500 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeletingId(t.id)} className="p-2 text-white/20 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProblemsManager() {
  const [problems, setProblems] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [newProblem, setNewProblem] = useState({ trackId: "", title: "", description: "" });
  const [editingProblem, setEditingProblem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubTracks = subscribe("tracks", (snapshot) => {
      setTracks(snapshot);
    }, {}, (err) => handleDbError(err, OperationType.GET, "tracks"));
    const unsubProblems = subscribe("problems", (snapshot) => {
      setProblems(snapshot);
    }, {}, (err) => handleDbError(err, OperationType.GET, "problems"));
    return () => {
      unsubTracks();
      unsubProblems();
    };
  }, []);

  const addProblem = async () => {
    if (!newProblem.title || !newProblem.trackId) return;
    try {
      await supabase.from("problems").insert(newProblem);
      setNewProblem({ trackId: "", title: "", description: "" });
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "problems");
    }
  };

  const updateProblem = async () => {
    if (!editingProblem || !editingProblem.title || !editingProblem.trackId) return;
    try {
      await supabase.from("problems").update({
        trackId: editingProblem.trackId,
        title: editingProblem.title,
        description: editingProblem.description
      }).eq("id", editingProblem.id);
      setEditingProblem(null);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `problems/${editingProblem.id}`);
    }
  };

  const removeProblem = async (id: string) => {
    try {
      await supabase.from("problems").delete().eq("id", id);
      setDeletingId(null);
    } catch (err) {
      handleDbError(err, OperationType.DELETE, `problems/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic">Statement <span className="text-white/20">Lab</span></h2>
        <p className="text-white/40 text-sm mt-2">Define specific challenges for each track.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 relative overflow-hidden">
        {editingProblem && (
          <div className="absolute inset-0 bg-accent-500/5 pointer-events-none border-b-2 border-accent-500" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <select 
                value={(editingProblem ? editingProblem.trackId : newProblem.trackId) || ""}
                onChange={(e) => editingProblem 
                  ? setEditingProblem({...editingProblem, trackId: e.target.value})
                  : setNewProblem({...newProblem, trackId: e.target.value})
                }
                className="bg-black/40 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 text-sm uppercase tracking-widest font-bold"
            >
                <option value="">Select Track</option>
                {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input 
                type="text" 
                placeholder="Problem Title" 
                value={(editingProblem ? editingProblem.title : newProblem.title) || ""}
                onChange={(e) => editingProblem
                  ? setEditingProblem({...editingProblem, title: e.target.value})
                  : setNewProblem({...newProblem, title: e.target.value})
                }
                className="bg-black/40 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 text-sm"
            />
        </div>
        <textarea 
          placeholder="Problem Description" 
          value={(editingProblem ? editingProblem.description : newProblem.description) || ""}
          onChange={(e) => editingProblem
            ? setEditingProblem({...editingProblem, description: e.target.value})
            : setNewProblem({...newProblem, description: e.target.value})
          }
          className="w-full bg-black/40 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-accent-500 text-sm min-h-[100px] relative z-10"
        />
        <div className="flex gap-2 relative z-10">
          {editingProblem ? (
            <>
              <button onClick={updateProblem} className="flex-1 bg-accent-500 text-black px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-400 transition-all uppercase text-xs tracking-[0.2em]">
                 Save Changes
              </button>
              <button onClick={() => setEditingProblem(null)} className="bg-white/10 text-white p-4 rounded-xl hover:bg-white/20 transition-all">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button onClick={addProblem} className="w-full bg-white text-black px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-500 hover:text-white transition-all uppercase text-xs tracking-[0.2em]">
              <Plus className="w-4 h-4" /> Add Problem Statement
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {problems.map(p => (
          <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row justify-between gap-6 group">
            <div className="space-y-2">
              <span className="px-2 py-0.5 bg-accent-500/10 text-accent-500 rounded-md text-[10px] font-bold uppercase tracking-widest border border-accent-500/20">
                {tracks.find(t => t.id === p.trackId)?.name || 'Unknown Track'}
              </span>
              <h4 className="font-black uppercase tracking-tight text-xl">{p.title}</h4>
              <p className="text-white/40 text-xs leading-relaxed max-w-2xl whitespace-pre-wrap">{p.description}</p>
            </div>
            <div className="flex items-center gap-2 self-start">
              {deletingId === p.id ? (
                 <div className="flex items-center gap-2 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                   <button onClick={() => removeProblem(p.id)} className="text-[11px] bg-red-500 text-white px-4 py-2 rounded-md font-black uppercase tracking-widest hover:bg-red-600 transition-all">
                     Confirm
                   </button>
                   <button onClick={() => setDeletingId(null)} className="text-[11px] text-white/40 hover:text-white px-2 font-bold uppercase tracking-widest">
                     Cancel
                   </button>
                 </div>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setEditingProblem(p);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-accent-500 hover:text-black transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setDeletingId(p.id)} 
                    className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineManager() {
    const [items, setItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ event: "", time: "", description: "", day: "1", order: 0 });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        return subscribe("timeline", setItems, { orderBy: { column: "order" } },
            (err) => handleDbError(err, OperationType.GET, "timeline"));
    }, []);

    const addItem = async () => {
        if (!newItem.event) return;
        try {
            await supabase.from("timeline").insert(newItem);
            setNewItem({ event: "", time: "", description: "", day: "1", order: items.length });
        } catch (err) {
            handleDbError(err, OperationType.CREATE, "timeline");
        }
    };

    const seedDefaults = async () => {
        const defaults = [
            { time: "09:00 AM", event: "Check-in & Uplink", description: "Hardware verification and team protocol initialization.", day: "1", order: 0 },
            { time: "11:00 AM", event: "Opening Briefing", description: "Keynote by AI engineers and problem node reveals.", day: "1", order: 1 },
            { time: "12:00 PM", event: "HACKING: START", description: "Sub-space transmission begins. Build phase active.", day: "1", order: 2 },
            { time: "08:00 PM", event: "Technical Review 01", description: "Mid-phase evaluation by elite mentors.", day: "1", order: 3 },
            { time: "02:00 AM", event: "Midnight Surge", description: "High-intensity coding session with cloud boost.", day: "2", order: 4 },
            { time: "11:00 AM", event: "Soft Freeze", description: "Code finalization and staging phase.", day: "2", order: 5 },
            { time: "12:00 PM", event: "HACKING: STOP", description: "All systems lock. Final build submission.", day: "2", order: 6 },
            { time: "03:00 PM", event: "Grand Finale", description: "Elite pitching and winner extraction.", day: "2", order: 7 }
        ];

        for (const item of defaults) {
            await supabase.from("timeline").insert(item);
        }
    };

    const removeItem = async (id: string) => {
        try {
            await supabase.from("timeline").delete().eq("id", id);
            setDeletingId(null);
        } catch (err) {
            handleDbError(err, OperationType.DELETE, `timeline/${id}`);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">Time <span className="text-white/20">Forge</span></h2>
                <p className="text-white/40 text-sm mt-2">Structure the hackathon journey.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input 
                        type="text" 
                        placeholder="Event Name" 
                        value={newItem.event || ""}
                        onChange={(e) => setNewItem({...newItem, event: e.target.value})}
                        className="bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-500 text-sm"
                    />
                    <input 
                        type="text" 
                        placeholder="Time (e.g. 10:00 AM)" 
                        value={newItem.time || ""}
                        onChange={(e) => setNewItem({...newItem, time: e.target.value})}
                        className="bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-500 text-sm"
                    />
                    <select
                        value={newItem.day || "1"}
                        onChange={(e) => setNewItem({...newItem, day: e.target.value})}
                        className="bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-500 text-sm text-white/50"
                    >
                        <option value="1">Day 1</option>
                        <option value="2">Day 2</option>
                    </select>
                    <input 
                        type="number" 
                        placeholder="Order" 
                        value={newItem.order || 0}
                        onChange={(e) => setNewItem({...newItem, order: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-500 text-sm"
                    />
                </div>
                <textarea 
                    placeholder="Brief description of the event..."
                    value={newItem.description || ""}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-500 text-sm h-24 resize-none"
                />
                <div className="flex gap-4">
                    <button onClick={addItem} className="flex-1 bg-accent-500 text-black p-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-accent-400 transition-colors">
                        Add Step
                    </button>
                    {items.length === 0 && (
                        <button onClick={seedDefaults} className="px-6 bg-white/10 text-white p-4 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-white/20 transition-colors">
                            Seed Defaults
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {["1", "2"].map(dayNum => (
                    <div key={dayNum} className="space-y-3">
                        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-white/20">
                            <div className="w-8 h-[1px] bg-white/10" /> DAY 0{dayNum} MISSION LOGS
                        </div>
                        <div className="space-y-2">
                            {items.filter(i => (i.day || "1") === dayNum).map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl group transition-all hover:bg-white/10">
                                    <div className="flex items-center gap-6">
                                        <span className="text-white/20 font-black italic text-xl">#{item.order}</span>
                                        <div>
                                            <h4 className="font-bold uppercase tracking-widest text-sm">{item.event}</h4>
                                            <p className="text-accent-500 text-[11px] uppercase font-black">{item.time}</p>
                                            {item.description && <p className="text-white/20 text-[11px] mt-1 italic">{item.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {deletingId === item.id ? (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => removeItem(item.id)} className="text-[10px] bg-red-500 text-white px-2 py-1 rounded font-bold uppercase">Confirm</button>
                                                <button onClick={() => setDeletingId(null)} className="text-[10px] text-white/40 px-1 font-bold">CANCEL</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setDeletingId(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-500 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RoundsManager() {
    const [rounds, setRounds] = useState<any[]>([]);
    const [newRound, setNewRound] = useState({ name: "", description: "", order: 0, isActive: false });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        return subscribe("rounds", setRounds, { orderBy: { column: "order" } },
            (err) => handleDbError(err, OperationType.GET, "rounds"));
    }, []);

    const addRound = async () => {
        if (!newRound.name) return;
        try {
            await supabase.from("rounds").insert(newRound);
            setNewRound({ name: "", description: "", order: rounds.length, isActive: false });
        } catch (err) {
            handleDbError(err, OperationType.CREATE, "rounds");
        }
    };

    const toggleActive = async (id: string, current: boolean, round: any) => {
        try {
            const nextState = !current;
            
            // Activating clears every other round in one statement.
            const { error: toggleErr } = await supabase.rpc("set_active_round", {
                p_round: id,
                p_active: nextState,
            });
            if (toggleErr) throw toggleErr;

            // If round is activated, broadcast to all approved teams
            if (nextState) {
                const { data: liveTeams } = await supabase
                    .from("teams")
                    .select("memberEmails")
                    .eq("status", "approved")
                    .eq("isEliminated", false);
                const allEmails = (liveTeams ?? []).flatMap((t: any) => t.memberEmails || []);
                
                if (allEmails.length > 0) {
                    fetch(api("/api/send-round-activation"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            emails: allEmails,
                            roundName: round.name,
                            description: round.description
                        })
                    }).catch(err => console.error("Round broadcast failed:", err));
                }
            }
        } catch (err) {
            handleDbError(err, OperationType.UPDATE, `rounds/${id}`);
        }
    };

    const removeRound = async (id: string) => {
        try {
            await supabase.from("rounds").delete().eq("id", id);
            setDeletingId(null);
        } catch (err) {
            handleDbError(err, OperationType.DELETE, `rounds/${id}`);
        }
    };

    const seedRounds = async () => {
      const defaultRounds = [
        { name: "Ideation Sprint", description: "Problem understanding and initial brainstorming.", order: 1, isActive: true },
        { name: "Research & Feasibility", description: "Market need and technical feasibility.", order: 2, isActive: false },
        { name: "System Design", description: "Architecture planning and tech stack selection.", order: 3, isActive: false },
        { name: "Development Sprint", description: "24-hour main coding and building phase.", order: 4, isActive: false },
        { name: "Surprise Challenge", description: "Adaptability and real-world thinking test.", order: 5, isActive: false },
        { name: "Final Demo & Pitch", description: "Solution presentation and live demo.", order: 6, isActive: false }
      ];
      for (const r of defaultRounds) {
          await supabase.from("rounds").insert(r);
      }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">Stage <span className="text-white/20">Gate</span></h2>
                    <p className="text-white/40 text-sm mt-2">Manage rounds and elimination gates.</p>
                </div>
                <button onClick={seedRounds} className="px-4 py-2 border border-info-500/30 text-info-400 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-info-500 hover:text-black transition-all">
                    <Database className="w-3.5 h-3.5" /> Sync Document Rounds
                </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        type="text" 
                        placeholder="Round Name" 
                        value={newRound.name || ""}
                        onChange={(e) => setNewRound({...newRound, name: e.target.value})}
                        className="bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-500 text-sm"
                    />
                    <input 
                        type="number" 
                        placeholder="Order" 
                        value={newRound.order || 0}
                        onChange={(e) => setNewRound({...newRound, order: parseInt(e.target.value)})}
                        className="bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-accent-500 text-sm"
                    />
                </div>
                <button onClick={addRound} className="w-full bg-white text-black p-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-accent-500"
                >
                    Create Round
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rounds.map(round => (
                    <div key={round.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">{round.name}</h3>
                                <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-bold">Sequence #{round.order}</p>
                            </div>
                            <button 
                                onClick={() => toggleActive(round.id, round.isActive, round)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
                                    round.isActive ? "bg-green-500 text-black border-green-500" : "bg-white/5 text-white/20 border-white/10"
                                )}
                            >
                                {round.isActive ? "ACTIVE" : "INACTIVE"}
                            </button>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-white/5 items-center gap-4">
                            {deletingId === round.id ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeRound(round.id)} className="text-[10px] bg-red-500 text-white px-3 py-1.5 rounded font-bold uppercase">Confirm Delete</button>
                                    <button onClick={() => setDeletingId(null)} className="text-[10px] text-white/40 px-2 font-bold">CANCEL</button>
                                </div>
                            ) : (
                                <button onClick={() => setDeletingId(round.id)} className="text-white/10 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EliminationManager() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'qualified' | 'eliminated' | null>(null);
  const [gateMarks, setGateMarks] = useState<number>(0);
  const [gateNote, setGateNote] = useState("");

  useEffect(() => {
    const unsubRounds = subscribe("rounds", (snap) => {
      const r = snap;
      setRounds(r);
      if (!activeRound && r.length > 0) setActiveRound(r.find((round: any) => round.isActive) || r[r.length - 1]);
    }, { orderBy: { column: "order" } }, (err) => handleDbError(err, OperationType.GET, "rounds"));
    const unsubTeams = subscribe("teams", (snap) => {
      setTeams(snap);
      setLoading(false);
    }, { eq: { column: "status", value: "approved" } }, (err) => handleDbError(err, OperationType.GET, "teams"));
    return () => { unsubRounds(); unsubTeams(); };
  }, [activeRound]);

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

      // Sync evaluation as well
      if (activeRound) {
        const evals = { ...(team.roundEvaluations || {}) };
        evals[activeRound.order.toString()] = {
          marks: gateMarks,
          comments: gateNote,
          updatedAt: new Date()
        };
        updates.roundEvaluations = evals;
      }

      await supabase.from("teams").update(updates).eq("id", team.id);

      fetch(api("/api/send-qualification-update"), {
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
      handleDbError(err, OperationType.UPDATE, `teams/${team.id}`); 
    }
  };

  const revertDecision = async (team: any) => {
    try {
      const updates: any = {
        isEliminated: false
      };
      // If they were qualified beyond this round, bring them back to this round
      if (team.currentRoundOrder > activeRound.order) {
        updates.currentRoundOrder = activeRound.order;
      }
      
      await supabase.from("teams").update(updates).eq("id", team.id);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `teams/${team.id}`);
    }
  };

  const contenders = teams.filter(t => !t.isEliminated && t.currentRoundOrder === activeRound?.order);
  const evaluated = teams.filter(t => 
    (t.isEliminated && t.currentRoundOrder === activeRound?.order) || 
    (t.currentRoundOrder > activeRound?.order)
  );

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">The <span className="text-white/20">Gate</span></h2>
        <p className="text-white/40 text-sm mt-2 font-medium">Evaluate team performance and manage progressive eliminations.</p>
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
              <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", activeRound?.id === r.id ? "text-black/60" : "text-accent-500")}>
                Round {r.order}
              </span>
              <span className="font-black text-sm uppercase tracking-tight">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-12">
        {/* Contenders Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-6 py-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] uppercase font-black tracking-[0.2em] text-white/30">Active Contenders ({contenders.length})</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-black tracking-[0.2em] text-accent-500">Processing Required</span>
              <div className="w-2 h-2 bg-accent-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
            </div>
          </div>

          {contenders.length === 0 ? (
            <div className="py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
              <p className="text-white/20 uppercase tracking-[0.3em] font-black text-[11px]">No squads pending evaluation at this gate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contenders.map(team => {
                const isProcessing = processingId === team.id;
                const submission = team.roundSubmissions?.[activeRound.order.toString()];

                return (
                  <div key={team.id} className="bg-white/5 border border-white/10 p-8 rounded-[40px] group relative overflow-hidden transition-all hover:bg-white/[0.07] hover:border-white/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    
                    {isProcessing ? (
                      <div className="space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xl font-black uppercase tracking-tighter text-white">Decision: {processingStatus}</h4>
                            <button onClick={() => setProcessingId(null)} className="p-2 text-white/20 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-2">Score (0-100)</label>
                            <input 
                              type="number" 
                              value={gateMarks || 0}
                              onChange={(e) => setGateMarks(parseInt(e.target.value) || 0)}
                              className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-accent-500 font-black text-xl outline-none focus:border-accent-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-2">Justification / Note</label>
                            <textarea 
                              placeholder="Why this decision? Feedback for the squad..."
                              value={gateNote || ""}
                              onChange={(e) => setGateNote(e.target.value)}
                              className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm min-h-[100px] outline-none focus:border-accent-500 leading-relaxed"
                            />
                          </div>
                          <button 
                            onClick={() => processTeam(team)}
                            className={cn(
                              "w-full py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all",
                              processingStatus === 'qualified' ? "bg-green-500 text-black hover:bg-green-400" : "bg-red-500 text-white hover:bg-red-400"
                            )}
                          >
                            Finalize {processingStatus}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex flex-col">
                            <h4 className="text-3xl font-black uppercase tracking-tighter italic leading-none text-white">{team.name}</h4>
                            <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest mt-2">Gate #{activeRound.order} Contender</span>
                        </div>

                        {submission && (
                          <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                             <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Work Done Submission</p>
                             <p className="text-xs text-white/60 italic leading-relaxed line-clamp-3">"{submission.workDone}"</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => {
                              setProcessingId(team.id);
                              setProcessingStatus('qualified');
                            }}
                            className="group/btn bg-green-500/10 text-green-500 border border-green-500/20 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-green-500 hover:text-black transition-all flex items-center justify-center gap-2"
                          >
                            <Medal className="w-4 h-4" /> Qualify
                          </button>
                          <button 
                            onClick={() => {
                              setProcessingId(team.id);
                              setProcessingStatus('eliminated');
                            }}
                            className="group/btn bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" /> Eliminated
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Processed Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-6 py-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] uppercase font-black tracking-[0.2em] text-white/30">Gate History ({evaluated.length})</span>
          </div>

          {evaluated.length === 0 ? (
            <div className="py-12 text-center text-white/10 uppercase tracking-widest font-black text-[10px]">
              History ledger is empty for this gate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {evaluated.map(team => (
                <div key={team.id} className="bg-black/40 border border-white/5 p-6 rounded-3xl flex items-center justify-between group">
                  <div>
                    <h5 className="font-black uppercase tracking-tight text-white mb-1">{team.name}</h5>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                        team.isEliminated ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                      )}>
                        {team.isEliminated ? 'ELIMINATED' : 'QUALIFIED'}
                      </span>
                      {team.roundEvaluations?.[activeRound.order] && (
                        <span className="text-[9px] font-bold text-white/30">SCORE: {team.roundEvaluations[activeRound.order].marks}/100</span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => revertDecision(team)}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-accent-500 text-black rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-accent-400 transition-all"
                  >
                    <Database className="w-3.5 h-3.5" /> Revert
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EvaluationManager() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [comments, setComments] = useState("");

  useEffect(() => {
    const unsubRounds = subscribe("rounds", (snap) => {
      const r = snap;
      setRounds(r);
      if (!activeRound && r.length > 0) setActiveRound(r.find((round: any) => round.isActive) || r[0]);
    }, { orderBy: { column: "order" } }, (err) => handleDbError(err, OperationType.GET, "rounds"));
    const unsubTeams = subscribe("teams", (snap) => {
      setTeams(snap);
      setLoading(false);
    }, { eq: { column: "status", value: "approved" } }, (err) => handleDbError(err, OperationType.GET, "teams"));
    return () => {
      unsubRounds();
      unsubTeams();
    };
  }, [activeRound]);

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
      await supabase.from("teams").update({ roundEvaluations: evals }).eq("id", teamId);
      setEvaluating(null);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const currentTeams = teams.filter(t => !t.isEliminated && t.currentRoundOrder === activeRound?.order);

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">Scoring <span className="text-white/20">Matrix</span></h2>
          <p className="text-white/40 text-sm mt-2 font-medium">Review submissions and assign marks/feedback per round.</p>
        </div>
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
              <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", activeRound?.id === r.id ? "text-black/60" : "text-accent-500")}>
                Round {r.order}
              </span>
              <span className="font-black text-sm uppercase tracking-tight">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {currentTeams.length === 0 ? (
          <div className="py-24 text-center bg-white/5 border border-dashed border-white/10 rounded-[40px]">
            <Star className="w-16 h-16 text-white/5 mx-auto mb-6" />
            <p className="text-white/20 uppercase tracking-[0.3em] font-black text-xs">No teams available for evaluation in this sector.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {currentTeams.map(team => {
              const submission = team.roundSubmissions?.[activeRound.order.toString()];
              const evaluation = team.roundEvaluations?.[activeRound.order.toString()];
              const isEditing = evaluating === team.id;

              return (
                <div key={team.id} className="bg-white/5 border border-white/10 rounded-[40px] p-8 hover:bg-white/[0.07] transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 blur-[100px] pointer-events-none" />
                  
                  <div className="flex flex-col lg:flex-row gap-12 relative z-10">
                    {/* Team Info & Submission */}
                    <div className="flex-1 space-y-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-3xl font-black uppercase tracking-tight italic text-accent-500">{team.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Database className="w-3 h-3 text-white/20" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/30">{team.trackId}</span>
                          </div>
                        </div>
                        {evaluation && !isEditing && (
                           <div className="bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                             <CheckCircle className="w-3 h-3 text-green-500" />
                             <span className="text-[11px] font-black text-green-500 uppercase tracking-widest">Graded</span>
                           </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-white/20">
                          <FileText className="w-3.5 h-3.5" /> Work Done Manifest
                        </div>
                        <div className="p-6 bg-black/40 border border-white/10 rounded-3xl min-h-[120px]">
                          {submission ? (
                            <p className="text-sm text-white/70 leading-relaxed italic whitespace-pre-wrap">{submission.workDone}</p>
                          ) : (
                            <p className="text-sm text-white/20 italic font-medium">No progress report transmitted for this round yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evaluation Form */}
                    <div className="w-full lg:w-80 space-y-6">
                      {isEditing ? (
                        <div className="bg-white/5 border border-accent-500/30 p-6 rounded-3xl space-y-6 animate-in zoom-in-95 duration-200">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-2">Marks (0-100)</label>
                            <input 
                              type="number" 
                              max={100}
                              min={0}
                              value={marks || 0}
                              onChange={(e) => setMarks(parseInt(e.target.value) || 0)}
                              className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-accent-500 font-black text-xl outline-none focus:border-accent-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-2">Mentor Verdict</label>
                            <textarea 
                              placeholder="Logic solid, UI needs polish..."
                              value={comments || ""}
                              onChange={(e) => setComments(e.target.value)}
                              className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-sm min-h-[120px] outline-none focus:border-accent-500 leading-relaxed font-medium"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => saveEvaluation(team.id)}
                              className="flex-1 py-3 bg-accent-500 text-black font-black uppercase text-[11px] tracking-widest rounded-xl hover:bg-accent-400"
                            >
                              Finalize
                            </button>
                            <button 
                              onClick={() => setEvaluating(null)}
                              className="px-4 py-3 bg-white/5 text-white/40 rounded-xl hover:bg-white/10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {evaluation ? (
                            <div className="p-6 border border-white/5 bg-black/40 rounded-3xl space-y-4">
                              <div className="flex justify-between items-end">
                                <div>
                                  <div className="text-[11px] font-black uppercase tracking-widest text-white/20">Marks Assigned</div>
                                  <div className="text-4xl font-black italic">{evaluation.marks}<span className="text-white/20 text-sm ml-1">/100</span></div>
                                </div>
                                <button 
                                  onClick={() => {
                                    setEvaluating(team.id);
                                    setMarks(evaluation.marks);
                                    setComments(evaluation.comments);
                                  }}
                                  className="p-2 text-white/20 hover:text-accent-500 transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-accent-500/50">Feedback</div>
                                <p className="text-xs text-white/40 italic leading-relaxed">"{evaluation.comments}"</p>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setEvaluating(team.id);
                                setMarks(0);
                                setComments("");
                              }}
                              className="w-full py-12 border-2 border-dashed border-white/5 rounded-[40px] text-white/20 hover:border-accent-500/30 hover:text-accent-500 transition-all flex flex-col items-center gap-3"
                            >
                              <Star className="w-8 h-8 opacity-20" />
                              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Initialize Scoring</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EventTeamManager() {
  const [members, setMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ 
    name: '', 
    email: '', 
    designation: '', 
    company: '', 
    photo: '',
    permissions: {
      manage_teams: false,
      manage_mentors: false,
      manage_rounds: false,
      manage_tracks: false,
      manage_timeline: false,
      manage_speakers: false,
      manage_partners: false,
      manage_location: false,
      view_teams: false,
      manage_event_team: false,
      manage_email_marketing: false,
      manage_guests: false,
      manage_attendance: false
    }
  });
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [deletingMember, setDeletingMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const unsub = subscribe("event_team", (snap) => {
      setMembers(snap);
      setLoading(false);
    }, {}, (err) => handleDbError(err, OperationType.GET, "event_team"));
    return () => unsub();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    try {
      const cleanEmail = newMember.email.trim().toLowerCase();
      const processedPhoto = getImageUrl(newMember.photo);

      await supabase.from("event_team").upsert({
        name: newMember.name,
        email: cleanEmail,
        designation: newMember.designation,
        company: newMember.company,
        photo: processedPhoto,
        permissions: newMember.permissions,
      });

      // Notify event team member via API
      try {
        const response = await fetch(api("/api/notify-team-appointment"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            name: newMember.name,
            designation: newMember.designation,
            company: newMember.company,
            photo: processedPhoto,
            permissions: newMember.permissions
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setNotificationStatus({ type: 'success', message: `Event team member added and notification email sent to ${newMember.email}` });
        } else {
          setNotificationStatus({ type: 'error', message: `Added, but email failed: ${data.error || 'Check SMTP configuration'}` });
        }
      } catch (emailErr) {
        console.error("Notification trigger error:", emailErr);
        setNotificationStatus({ type: 'error', message: `Member added, but encountered a protocol error while connecting to mail server.` });
      }

      setNewMember({ 
        name: '', 
        email: '', 
        designation: '', 
        company: '', 
        photo: '',
        permissions: {
          manage_teams: false,
          manage_mentors: false,
          manage_rounds: false,
          manage_tracks: false,
          manage_timeline: false,
          manage_speakers: false,
          manage_partners: false,
          manage_location: false,
          view_teams: false,
          manage_event_team: false,
          manage_email_marketing: false,
          manage_guests: false,
          manage_attendance: false
        }
      });
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "event_team");
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name || !editingMember.email) return;

    try {
      const processedPhoto = getImageUrl(editingMember.photo);
      await supabase.from("event_team").update({
        name: editingMember.name,
        designation: editingMember.designation,
        company: editingMember.company,
        photo: processedPhoto,
        permissions: editingMember.permissions
      }).eq("email", editingMember.id);

      setEditingMember(null);
      setNotificationStatus({ type: 'success', message: 'Team member profile updated.' });
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `event_team/${editingMember.id}`);
    }
  };

  const confirmDeleteMember = async () => {
    if (!deletingMember) return;
    try {
      await supabase.from("event_team").delete().eq("email", deletingMember.id);
      setDeletingMember(null);
      setNotificationStatus({ type: 'success', message: 'Team member removed.' });
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err: any) {
      handleDbError(err, OperationType.DELETE, `event_team/${deletingMember.id}`);
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white flex items-center gap-4">
            <span className="p-3 bg-accent-500 rounded-2xl rotate-3 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <UserCheck className="text-black w-8 h-8" />
            </span>
            Event <span className="text-white/20">Team</span>
          </h2>
          <p className="text-white/40 text-sm mt-3 font-medium max-w-md">Appoint elite members to manage and evaluate the event execution.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-white">
        <div className="lg:col-span-1">
          <form onSubmit={handleAddMember} className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-8 sticky top-24 backdrop-blur-xl">
             <div className="flex items-center gap-3">
               <div className="w-1 h-6 bg-accent-500 rounded-full" />
               <p className="text-[12px] font-black uppercase tracking-[0.2em] text-accent-500">New Appointment</p>
             </div>
            
            <div className="space-y-5">
              <input 
                placeholder="Full Name"
                value={newMember.name}
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
              />
              <input 
                placeholder="Email Address"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
              />
              <input 
                placeholder="Photo URL"
                value={newMember.photo}
                onChange={(e) => setNewMember({...newMember, photo: e.target.value})}
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
              />
              <input 
                placeholder="Designation"
                value={newMember.designation}
                onChange={(e) => setNewMember({...newMember, designation: e.target.value})}
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
              />

              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-black uppercase text-white/40 tracking-wider">Granted Permissions</p>
                <div className="grid grid-cols-1 gap-2 text-[11px] font-bold">
                  {Object.keys(newMember.permissions).map((perm) => (
                    <label key={perm} className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-accent-500/50 transition-all group">
                      <input 
                        type="checkbox" 
                        checked={(newMember.permissions as any)[perm]} 
                        onChange={(e) => setNewMember({
                          ...newMember, 
                          permissions: { ...newMember.permissions, [perm]: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-white/10 bg-black/40 accent-accent-500 cursor-pointer"
                      />
                      <span className="group-hover:text-accent-500 transition-colors uppercase tracking-widest text-[10px] font-black">{perm.replace('manage_', 'MANAGE ').replace('view_', 'VIEW ').replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-accent-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-accent-400 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.2)]"
              >
                Appoint Member
              </button>
            </div>
            {notificationStatus && (
              <div className={`mt-4 p-4 rounded-xl text-xs font-black uppercase tracking-wider ${notificationStatus.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {notificationStatus.message}
              </div>
            )}
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {members.map(member => (
            <div key={member.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between group hover:bg-white/[0.08] transition-all">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 border border-white/10">
                   {member.photo ? <img src={member.photo} alt={member.name} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 m-3 text-white/20" />}
                 </div>
                 <div>
                   <h4 className="font-black uppercase italic text-white tracking-widest">{member.name}</h4>
                   <p className="text-[11px] text-accent-500 font-bold uppercase">{member.designation}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingMember(member)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><Edit2 className="w-4 h-4 text-white/40" /></button>
                <button onClick={() => setDeletingMember(member)} className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all"><Trash2 className="w-4 h-4 text-red-500/40" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingMember && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="bg-[#111] border border-white/10 p-10 rounded-[40px] max-w-lg w-full space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase italic text-white">Edit Profile</h3>
                <button onClick={() => setEditingMember(null)}><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleUpdateMember} className="space-y-4">
                <input 
                  value={editingMember.name} 
                  onChange={(e) => setEditingMember({...editingMember, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-white font-bold"
                />
                <input 
                  value={editingMember.designation} 
                  onChange={(e) => setEditingMember({...editingMember, designation: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-white font-bold"
                />
                <input 
                  value={editingMember.photo} 
                  onChange={(e) => setEditingMember({...editingMember, photo: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-white font-bold"
                />

                <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-black uppercase text-white/40 tracking-wider">Update Permissions</p>
                  <div className="grid grid-cols-1 gap-2 text-[11px] font-bold">
                    {Object.keys(editingMember.permissions || {}).map((perm) => (
                      <label key={perm} className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-accent-500/50 transition-all group">
                        <input 
                          type="checkbox" 
                          checked={(editingMember.permissions as any)[perm]} 
                          onChange={(e) => setEditingMember({
                            ...editingMember, 
                            permissions: { ...editingMember.permissions, [perm]: e.target.checked }
                          })}
                          className="w-5 h-5 rounded border-white/10 bg-black/40 accent-accent-500 cursor-pointer"
                        />
                        <span className="group-hover:text-accent-500 transition-colors uppercase tracking-widest text-[10px] font-black">{perm.replace('manage_', 'MANAGE ').replace('view_', 'VIEW ').replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-accent-500 text-black font-black uppercase rounded-2xl shadow-[0_20px_40px_rgba(34,197,94,0.2)]">Save Updates</button>
              </form>
            </div>
         </div>
      )}

      {deletingMember && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-[#111] border border-white/10 p-10 rounded-[40px] max-w-sm w-full text-center space-y-8">
            <p className="text-xl font-black uppercase italic text-white">Confirm Removal?</p>
            <div className="flex gap-4">
              <button onClick={confirmDeleteMember} className="flex-1 py-4 bg-red-500 text-black font-black uppercase rounded-2xl">Remove</button>
              <button onClick={() => setDeletingMember(null)} className="flex-1 py-4 bg-white/5 text-white font-black uppercase rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MentorsManager() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [newMentor, setNewMentor] = useState({ name: '', email: '', designation: '', company: '', role: 'Mentor', photo: '' });
  const [editingMentor, setEditingMentor] = useState<any | null>(null);
  const [deletingMentor, setDeletingMentor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [squadSearchQuery, setSquadSearchQuery] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const unsubMentors = subscribe("mentors", (snap) => {
      setMentors(snap);
      setLoading(false);
    }, {}, (err) => handleDbError(err, OperationType.GET, "mentors"));
    const unsubTeams = subscribe("teams", (snap) => {
      setTeams(snap);
    }, {}, (err) => handleDbError(err, OperationType.GET, "teams"));
    
    // Fetch tracks and problems for ID mapping
    const unsubTracks = subscribe("tracks", (snap) => {
      setTracks(snap);
    });
    const unsubProblems = subscribe("problems", (snap) => {
      setProblems(snap);
    });

    return () => { unsubMentors(); unsubTeams(); unsubTracks(); unsubProblems(); };
  }, []);

  const [tracks, setTracks] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);

  const handleAddMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentor.name || !newMentor.email) return;

    try {
      const cleanEmail = newMentor.email.trim().toLowerCase();
      const processedPhoto = getImageUrl(newMentor.photo);

      await supabase.from("mentors").upsert({
        name: newMentor.name,
        email: cleanEmail,
        designation: newMentor.designation,
        company: newMentor.company,
        photo: processedPhoto,
        assignedTeams: [],
      });

      // Notify event team member via API
      try {
        const response = await fetch(api("/api/notify-mentor-appointment"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            name: newMentor.name,
            designation: newMentor.designation,
            company: newMentor.company,
            photo: processedPhoto,
            mentorId: cleanEmail
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setNotificationStatus({ type: 'success', message: `Mentor added and notification email sent to ${newMentor.email}` });
        } else {
          setNotificationStatus({ type: 'error', message: `Mentor added, but email failed: ${data.error || 'Check SMTP configuration'}` });
        }
      } catch (emailErr) {
        console.error("Notification trigger error:", emailErr);
        setNotificationStatus({ type: 'error', message: `Mentor added, but encountered a protocol error while connecting to mail server.` });
      }

      setNewMentor({ name: '', email: '', designation: '', company: '', role: 'Mentor', photo: '' });
      // Auto-clear notification after 5 seconds
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "mentors");
    }
  };

  const assignTeamToMentor = async (mentorId: string, teamId: string) => {
    try {
      const mentor = mentors.find(m => m.id === mentorId);
      const team = teams.find(t => t.id === teamId);
      
      if (!mentor || !team) return;

      // Clean up previous assignment if exists
      if (team.assignedMentorId && team.assignedMentorId !== mentorId) {
        await supabase.rpc("mentor_remove_team", {
          p_email: team.assignedMentorId,
          p_team: teamId,
        });
      }

      // Update mentor
      await supabase.rpc("mentor_add_team", { p_email: mentorId, p_team: teamId });

      // Update team
      await supabase.from("teams").update({
        assignedMentorId: mentorId,
        assignedMentorName: mentor.name,
        assignedMentorEmail: mentor.email,
        assignedMentorDesignation: mentor.designation || '',
        assignedMentorCompany: mentor.company || ''
      }).eq("id", teamId);

      setAssigningTo(null);

      // Notify both parties
      const teamTrack = tracks.find(tr => tr.id === team.trackId || tr.name === team.trackId);
      const teamProblem = problems.find(pr => pr.id === team.problemId || pr.title === team.problemId);

      fetch(api("/api/send-assignment-notifications"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentor: {
            name: mentor.name,
            email: mentor.email,
            designation: mentor.designation,
            company: mentor.company
          },
          team: {
            name: team.name,
            trackName: teamTrack ? (teamTrack.name || teamTrack.title) : team.trackId,
            problemName: teamProblem ? (teamProblem.title) : team.problemId,
            memberEmails: team.memberEmails
          }
        })
      }).catch(e => console.error("Assignment notification failed:", e));
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `mentors/${mentorId}`);
    }
  };

  const unassignTeam = async (mentorId: string, teamId: string) => {
    try {
      await supabase.rpc("mentor_remove_team", { p_email: mentorId, p_team: teamId });
      await supabase.from("teams").update({
        assignedMentorId: null,
        assignedMentorName: null,
        assignedMentorEmail: null,
        assignedMentorDesignation: null,
        assignedMentorCompany: null
      }).eq("id", teamId);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const confirmDeleteMentor = async () => {
    if (!deletingMentor) return;

    try {
      // Unassign teams
      if (deletingMentor.assignedTeams && Array.isArray(deletingMentor.assignedTeams)) {
        const unassignPromises = deletingMentor.assignedTeams.map((teamId: string) => 
          supabase.from("teams").update({
            assignedMentorName: null,
            assignedMentorEmail: null,
            assignedMentorId: null,
            assignedMentorDesignation: null,
            assignedMentorCompany: null
          }).eq("id", teamId).then(({ error }) => {
            if (error) console.warn(`Unassign failed for team ${teamId}:`, error);
          })
        );
        await Promise.all(unassignPromises);
      }

      await supabase.from("mentors").delete().eq("email", deletingMentor.id);
      setDeletingMentor(null);
      setNotificationStatus({ type: 'success', message: 'Mentor profile terminated.' });
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err: any) {
      console.error("Deletion failed:", err);
      setNotificationStatus({ type: 'error', message: 'Failed to dismiss mentor. Check your permissions.' });
      setTimeout(() => setNotificationStatus(null), 5000);
    }
  };

  const handleResendNotification = async (mentor: any) => {
    try {
      const cleanEmail = mentor.email.trim().toLowerCase();
      setNotificationStatus({ type: 'success', message: `Resending instructions to ${mentor.name}...` });
      
      const response = await fetch(api("/api/notify-mentor-appointment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          name: mentor.name,
          designation: mentor.designation,
          company: mentor.company,
          mentorId: mentor.id
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setNotificationStatus({ type: 'success', message: `Protocol re-transmitted to ${mentor.email}` });
      } else {
        setNotificationStatus({ type: 'error', message: `Re-transmission FAILED: ${data.error || 'Check SMTP'}` });
      }
    } catch (err) {
      console.error("Resend error:", err);
      setNotificationStatus({ type: 'error', message: `Critical signal error during transmission.` });
    }
    setTimeout(() => setNotificationStatus(null), 5000);
  };

  const handleUpdateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMentor || !editingMentor.name || !editingMentor.email) return;

    try {
      const processedPhoto = getImageUrl(editingMentor.photo);
      await supabase.from("mentors").update({
        name: editingMentor.name,
        designation: editingMentor.designation,
        company: editingMentor.company,
        photo: processedPhoto
      }).eq("email", editingMentor.id);

      // Also update team references if profile changed
      if (editingMentor.assignedTeams && editingMentor.assignedTeams.length > 0) {
        for (const teamId of editingMentor.assignedTeams) {
          await supabase.from("teams").update({
            assignedMentorName: editingMentor.name,
            assignedMentorDesignation: editingMentor.designation || '',
            assignedMentorCompany: editingMentor.company || ''
          }).eq("id", teamId);
        }
      }

      setEditingMentor(null);
      setNotificationStatus({ type: 'success', message: 'Mentor profile updated.' });
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `mentors/${editingMentor.id}`);
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white flex items-center gap-4">
            <span className="p-3 bg-info-500 rounded-2xl -rotate-3 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <Users className="text-black w-8 h-8" />
            </span>
            Mentor <span className="text-white/20">Squad</span>
          </h2>
          <p className="text-white/40 text-sm mt-3 font-medium max-w-md">Industry veterans providing deep technical guidance to participating teams.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-white">
        <div className="lg:col-span-1">
          <form onSubmit={handleAddMentor} className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-8 sticky top-24 backdrop-blur-xl">
             <div className="flex items-center gap-3">
               <div className="w-1 h-6 bg-info-500 rounded-full" />
               <p className="text-[12px] font-black uppercase tracking-[0.2em] text-info-500">New Induction</p>
             </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Member Identity</label>
                <input 
                  placeholder="Full Name"
                  value={newMentor.name}
                  onChange={(e) => setNewMentor({...newMentor, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all placeholder:text-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Communication Channel</label>
                <input 
                  placeholder="Email Address"
                  type="email"
                  value={newMentor.email}
                  onChange={(e) => setNewMentor({...newMentor, email: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all placeholder:text-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Photo URL (Drive UC URL)</label>
                <input 
                  placeholder="e.g. https://drive.google.com/uc?..."
                  value={newMentor.photo}
                  onChange={(e) => setNewMentor({...newMentor, photo: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all placeholder:text-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Designation</label>
                  <input 
                    placeholder="e.g. Lead Organizer"
                    value={newMentor.designation}
                    onChange={(e) => setNewMentor({...newMentor, designation: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all placeholder:text-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Company</label>
                  <input 
                    placeholder="e.g. OptiMaxin"
                    value={newMentor.company}
                    onChange={(e) => setNewMentor({...newMentor, company: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all placeholder:text-white/10"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-info-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-info-400 transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(59,130,246,0.2)] group"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Induct Mentor
              </button>

              {notificationStatus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-xl flex items-center gap-3 border ${
                    notificationStatus.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    notificationStatus.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {notificationStatus.type === 'success' ? <UserCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider">{notificationStatus.message}</span>
                </motion.div>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between ml-4">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white/30">Active Team ({mentors.length})</p>
            <div className="h-px flex-1 bg-white/5 mx-8" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {mentors.map(mentor => (
              <div key={mentor.id} className="bg-white/5 border border-white/10 p-8 rounded-[40px] flex items-center justify-between group hover:bg-white/[0.07] transition-all hover:border-accent-500/20 shadow-xl">
                <div className="flex items-center gap-8">
                  <div className="relative">
                    <div className="w-16 h-16 bg-accent-500/10 border border-accent-500/20 rounded-[24px] overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      {mentor.photo ? (
                        <img src={mentor.photo} alt={mentor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserCheck className="w-8 h-8 text-accent-500" />
                      )}
                    </div>
                    {(() => {
                      const assignedSquads = teams.filter(t => mentor.assignedTeams?.includes(t.id));
                      return assignedSquads.length > 0 ? (
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-accent-500 text-black rounded-full flex items-center justify-center text-[11px] font-black border-4 border-[#0a0a0a]">
                          {assignedSquads.length}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <h4 className="font-black uppercase text-white text-2xl leading-none tracking-tighter italic group-hover:text-accent-500 transition-colors">{mentor.name}</h4>
                    <p className="text-[11px] text-accent-500 font-black uppercase tracking-widest mt-1">
                      {mentor.designation} {mentor.company ? `@ ${mentor.company}` : ''}
                    </p>
                    <p className="text-[11px] text-white/30 font-bold mt-1 uppercase tracking-widest">{mentor.email}</p>
                    <div className="flex items-center gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingMentor(mentor)}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white hover:border-white/30 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button 
                        onClick={() => handleResendNotification(mentor)}
                        className="p-2 bg-accent-500/10 border border-accent-500/20 rounded-lg text-accent-500/40 hover:text-accent-500 hover:border-accent-500/30 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Mail className="w-3 h-3" /> Resend
                      </button>
                      <button 
                        onClick={() => setDeletingMentor(mentor)}
                        className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500/40 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    {(() => {
                      const assignedSquads = teams.filter(t => mentor.assignedTeams?.includes(t.id));
                      return (
                        <>
                          <p className="text-[11px] font-black uppercase text-white/20 tracking-widest">Responsibility</p>
                          <p className="text-lg font-black text-white italic">{assignedSquads.length} Squads</p>
                          <div className="flex flex-col items-end gap-1.5 mt-3">
                            {assignedSquads.map(team => (
                              <div key={team.id} className="flex items-center gap-2 group/assigned">
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap bg-white/5 px-2 py-0.5 rounded border border-white/5">{team.name}</span>
                                <button 
                                  onClick={() => unassignTeam(mentor.id, team.id)}
                                  className="text-red-500/30 hover:text-red-500 p-1 transition-all hover:bg-red-500/10 rounded-md"
                                  title="Unassign Squad"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setAssigningTo(assigningTo === mentor.id ? null : mentor.id);
                        setSquadSearchQuery("");
                      }}
                      className={cn(
                        "px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all gap-2 flex items-center",
                        assigningTo === mentor.id ? "bg-white text-black" : "bg-white/5 text-white/60 hover:text-white border border-white/10 hover:border-white/30"
                      )}
                    >
                      {assigningTo === mentor.id ? "Close Selection" : "Assign Squad"}
                    </button>

                    {assigningTo === mentor.id && (
                      <div className="absolute right-0 top-full mt-4 w-72 bg-[#151515] border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50 p-3 max-h-[400px] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
                        {/* Search Input Box */}
                        <div className="p-2 border-b border-white/5 mb-2 space-y-2">
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl focus-within:border-accent-500 transition-all">
                            <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
                            <input 
                              type="text"
                              placeholder="SEARCH SQUAD..."
                              value={squadSearchQuery}
                              onChange={(e) => setSquadSearchQuery(e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-[11px] text-white placeholder-white/30 font-black uppercase tracking-widest"
                              autoFocus
                            />
                            {squadSearchQuery && (
                              <button 
                                onClick={() => setSquadSearchQuery("")}
                                className="text-white/40 hover:text-white transition-all shrink-0 p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Select Target Unit</p>
                        </div>
                        <div className="space-y-1">
                          {(() => {
                            const unassigned = teams.filter(t => !t.assignedMentorEmail);
                            const filtered = unassigned.filter(team => 
                              team.name?.toLowerCase().includes(squadSearchQuery.toLowerCase())
                            );
                            if (filtered.length === 0) {
                              return (
                                <div className="p-6 text-center">
                                  <ShieldCheck className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                  <p className="text-[11px] text-white/20 font-bold uppercase tracking-widest italic leading-relaxed">
                                    {unassigned.length === 0 ? "All units assigned." : "No matching units found."}
                                  </p>
                                </div>
                              );
                            }
                            return filtered.map(team => (
                              <button 
                                key={team.id}
                                onClick={() => {
                                  assignTeamToMentor(mentor.id, team.id);
                                  setSquadSearchQuery("");
                                }}
                                className="w-full text-left p-4 hover:bg-accent-500 hover:text-black rounded-2xl text-xs font-black uppercase transition-all group/team"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{team.name}</span>
                                  <ChevronRight className="w-4 h-4 opacity-0 group-hover/team:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingMentor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#151515] border border-white/10 rounded-[40px] p-10 relative shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
          >
            <button 
              onClick={() => setEditingMentor(null)}
              className="absolute top-8 right-8 p-3 bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white transition-all hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-accent-500/10 border border-accent-500/20 rounded-2xl flex items-center justify-center">
                <Edit2 className="w-6 h-6 text-accent-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">Modify Identity</h3>
                <p className="text-[11px] font-black uppercase tracking-widest text-white/20 mt-1">Mentor Reconstruction</p>
              </div>
            </div>

            <form onSubmit={handleUpdateMentor} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Full Name</label>
                <input 
                  value={editingMentor.name || ""}
                  onChange={(e) => setEditingMentor({...editingMentor, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Photo URL</label>
                <input 
                  value={editingMentor.photo || ""}
                  onChange={(e) => setEditingMentor({...editingMentor, photo: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Designation</label>
                  <input 
                    value={editingMentor.designation || ''}
                    onChange={(e) => setEditingMentor({...editingMentor, designation: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Company</label>
                  <input 
                    value={editingMentor.company || ''}
                    onChange={(e) => setEditingMentor({...editingMentor, company: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Communication Info (Immutable)</label>
                <input 
                  value={editingMentor.email}
                  readOnly
                  className="w-full bg-black/20 border border-white/5 p-5 rounded-2xl outline-none text-white/30 text-sm font-bold transition-all cursor-not-allowed"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-5 bg-accent-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-accent-400 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.2)]"
                >
                  Save Changes
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingMentor(null)}
                  className="flex-1 py-5 bg-white/5 text-white font-black uppercase text-xs tracking-[0.2em] border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {deletingMentor && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#1a1a1a] border border-red-500/20 rounded-[40px] p-10 relative shadow-[0_40px_100px_rgba(239,68,68,0.1)]"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-[32px] flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">Dismiss Mentor?</h3>
                <p className="text-xs font-medium text-white/40 max-w-xs mx-auto">
                  You are about to terminate the mission oversight for <span className="text-red-500 font-bold">{deletingMentor.name}</span>. 
                  All assigned units will be unlinked immediately.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3 pt-4">
                <button 
                  onClick={confirmDeleteMentor}
                  className="w-full py-5 bg-red-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-red-400 transition-all shadow-2xl flex items-center justify-center gap-3"
                >
                  <Trash2 className="w-5 h-5" /> Dismiss Permanent
                </button>
                <button 
                  onClick={() => setDeletingMentor(null)}
                  className="w-full py-5 bg-white/5 text-white font-black uppercase text-xs tracking-[0.2em] border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
                >
                  Abort Action
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const SpeakerItem = ({ s, onEdit, onDelete, deletingId, setDeletingId, removeSpeaker }: any) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div key={s.id} className="group relative bg-[#0d0d0d] border border-white/10 p-8 rounded-[40px] hover:border-accent-500/30 transition-all overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Star className="w-16 h-16 text-white" />
      </div>
      <div className="relative z-10">
        <div className="w-24 h-24 rounded-[32px] overflow-hidden mb-6 border-2 border-white/10 group-hover:border-accent-500/50 transition-colors bg-white/5 flex items-center justify-center">
          {s.photo && !imgError ? (
            <img 
              src={getImageUrl(s.photo)} 
              alt={s.name} 
              className="w-full h-full object-cover transition-all duration-700"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="text-2xl font-black text-white/10 uppercase italic">{s.name.charAt(0)}</div>
          )}
        </div>
        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-1 leading-none">{s.name}</h4>
        <div className="text-sm font-bold uppercase tracking-widest text-accent-500 mb-4">{s.role}</div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/20 font-black flex items-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 bg-accent-500 rounded-full" />
          {s.company}
        </div>
        
        <div className="flex items-center gap-3 pt-6 border-t border-white/5">
          <button 
            onClick={() => onEdit(s)} 
            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white hover:border-white/30 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button 
            onClick={() => setDeletingId(s.id)} 
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500/40 hover:text-red-500 hover:border-red-500/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {deletingId === s.id && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
          <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
          <h4 className="text-lg font-black uppercase italic text-white mb-2 leading-tight">Delete Profile?</h4>
          <p className="text-xs text-white/40 mb-6 font-medium">This will permanently remove the speaker from the platform.</p>
          <div className="flex w-full gap-2">
            <button onClick={() => removeSpeaker(s.id)} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black uppercase text-[11px] tracking-widest">Confirm</button>
            <button onClick={() => setDeletingId(null)} className="flex-1 bg-white/10 text-white py-3 rounded-xl font-black uppercase text-[11px] tracking-widest">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

function SpeakersManager() {
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [newSpeaker, setNewSpeaker] = useState({ name: "", role: "", company: "", photo: "" });
  const [editingSpeaker, setEditingSpeaker] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    return subscribe("speakers", setSpeakers,
      { orderBy: { column: "createdAt", ascending: false } },
      (error) => handleDbError(error, OperationType.GET, "speakers"));
  }, []);

  const addSpeaker = async () => {
    if (!newSpeaker.name) return;
    try {
      const processedPhoto = getImageUrl(newSpeaker.photo);
      await supabase.from("speakers").insert({
        ...newSpeaker,
        photo: processedPhoto
      });
      setNewSpeaker({ name: "", role: "", company: "", photo: "" });
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "speakers");
    }
  };

  const updateSpeaker = async () => {
    if (!editingSpeaker || !editingSpeaker.name) return;
    try {
      const processedPhoto = getImageUrl(editingSpeaker.photo);
      await supabase.from("speakers").update({
        name: editingSpeaker.name,
        role: editingSpeaker.role,
        company: editingSpeaker.company,
        photo: processedPhoto
      }).eq("id", editingSpeaker.id);
      setEditingSpeaker(null);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `speakers/${editingSpeaker.id}`);
    }
  };

  const removeSpeaker = async (id: string) => {
    try {
      await supabase.from("speakers").delete().eq("id", id);
      setDeletingId(null);
    } catch (err) {
      handleDbError(err, OperationType.DELETE, `speakers/${id}`);
    }
  };

  const seedDefaults = async () => {
    const defaults = [
      { name: "Sarah Connor", role: "Lead AI Architect", company: "Google Cloud", photo: "https://plus.unsplash.com/premium_photo-1681412217144-8bd92efbe05a?q=80&w=300&h=300&fit=crop" },
      { name: "Elon M.", role: "Mars Protocol Engineer", company: "SpaceX", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&h=300&fit=crop" },
      { name: "Jensen Huang", role: "Visual Compute Lead", company: "NVIDIA", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&h=300&fit=crop" }
    ];
    for (const s of defaults) {
      await supabase.from("speakers").insert(s);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Session <span className="text-white/20">Speakers</span></h2>
          <p className="text-white/40 text-sm mt-2">Manage the lineup of speakers for Hacktoberfest Dehradun.</p>
        </div>
        {speakers.length === 0 && (
          <button onClick={seedDefaults} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
            Seed Defaults
          </button>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
        {editingSpeaker && (
           <div className="absolute inset-x-0 top-0 h-1 bg-accent-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Speaker Name</label>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={(editingSpeaker ? editingSpeaker.name : newSpeaker.name) || ""}
              onChange={(e) => editingSpeaker 
                ? setEditingSpeaker({...editingSpeaker, name: e.target.value})
                : setNewSpeaker({...newSpeaker, name: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Designation / Session Role</label>
            <input 
              type="text" 
              placeholder="e.g. Lead Engineer" 
              value={(editingSpeaker ? editingSpeaker.role : newSpeaker.role) || ""}
              onChange={(e) => editingSpeaker
                ? setEditingSpeaker({...editingSpeaker, role: e.target.value})
                : setNewSpeaker({...newSpeaker, role: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Company / Organization</label>
            <input 
              type="text" 
              placeholder="e.g. Google" 
              value={(editingSpeaker ? editingSpeaker.company : newSpeaker.company) || ""}
              onChange={(e) => editingSpeaker
                ? setEditingSpeaker({...editingSpeaker, company: e.target.value})
                : setNewSpeaker({...newSpeaker, company: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Photo URL (Drive Link / Direct)</label>
            <input 
              type="text" 
              placeholder="Paste image URL here" 
              value={(editingSpeaker ? editingSpeaker.photo : newSpeaker.photo) || ""}
              onChange={(e) => editingSpeaker
                ? setEditingSpeaker({...editingSpeaker, photo: e.target.value})
                : setNewSpeaker({...newSpeaker, photo: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
        </div>
        <div className="flex gap-4">
          {editingSpeaker ? (
            <>
              <button 
                onClick={updateSpeaker} 
                className="flex-1 py-5 bg-accent-500 text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-accent-400 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.2)]"
              >
                Save Changes
              </button>
              <button 
                onClick={() => setEditingSpeaker(null)} 
                className="px-8 py-5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all font-black uppercase text-xs tracking-widest"
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={addSpeaker} 
              className="w-full py-5 bg-accent-500 text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-accent-400 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.2)] flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" /> Deploy Speaker Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {speakers.map(s => (
          <SpeakerItem 
            key={s.id} 
            s={s} 
            onEdit={(speaker: any) => {
              setEditingSpeaker(speaker);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            deletingId={deletingId}
            setDeletingId={setDeletingId}
            removeSpeaker={removeSpeaker}
          />
        ))}
      </div>
    </div>
  );
}

const PartnerItem = ({ p, onEdit, onDelete, deletingId, setDeletingId, removePartner }: any) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div key={p.id} className="group relative bg-[#0d0d0d] border border-white/10 p-6 rounded-[32px] hover:border-accent-500/30 transition-all">
      <div className="relative z-10 flex flex-col items-center text-center">
        {p.logo && !imgError ? (
          <div className="w-20 h-20 mb-4 rounded-2xl overflow-hidden bg-white/5 p-3 border border-white/10">
            <img 
              src={getImageUrl(p.logo)} 
              alt={p.name} 
              className="w-full h-full object-contain transition-all" 
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-20 h-20 mb-4 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-accent-500/30 transition-all">
            <span className="text-2xl font-black text-white/10 uppercase italic">{p.name.charAt(0)}</span>
          </div>
        )}
        <div className="text-xl font-black italic tracking-tighter text-white mb-2 group-hover:text-accent-500 transition-colors uppercase leading-tight">{p.name}</div>
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-accent-500/60 mb-6">{p.tier} Partner</div>
        
        <div className="flex items-center gap-2 w-full pt-4 border-t border-white/5">
          <button 
            onClick={() => onEdit(p)} 
            className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white hover:border-white/30 transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button 
            onClick={() => setDeletingId(p.id)} 
            className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500/40 hover:text-red-500 hover:border-red-500/30 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {deletingId === p.id && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-300 rounded-[32px]">
          <h4 className="text-[11px] font-black uppercase italic text-white mb-4 leading-tight">Remove Partner?</h4>
          <div className="flex w-full gap-2">
            <button onClick={() => removePartner(p.id)} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-black uppercase text-[9px] tracking-widest">Yes</button>
            <button onClick={() => setDeletingId(null)} className="flex-1 bg-white/10 text-white py-2 rounded-lg font-black uppercase text-[9px] tracking-widest">No</button>
          </div>
        </div>
      )}
    </div>
  );
};

function PartnersManager() {
  const [partners, setPartners] = useState<any[]>([]);
  const [newPartner, setNewPartner] = useState({ name: "", tier: "", logo: "", order: 0 });
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    return subscribe("partners", setPartners, { orderBy: { column: "order" } },
      (error) => handleDbError(error, OperationType.GET, "partners"));
  }, []);

  const addPartner = async () => {
    if (!newPartner.name) return;
    try {
      await supabase.from("partners").insert({
        ...newPartner,
        order: Number(newPartner.order)
      });
      setNewPartner({ name: "", tier: "", logo: "", order: partners.length + 1 });
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "partners");
    }
  };

  const updatePartner = async () => {
    if (!editingPartner || !editingPartner.name) return;
    try {
      await supabase.from("partners").update({
        name: editingPartner.name,
        tier: editingPartner.tier,
        logo: editingPartner.logo || "",
        order: Number(editingPartner.order)
      }).eq("id", editingPartner.id);
      setEditingPartner(null);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `partners/${editingPartner.id}`);
    }
  };

  const removePartner = async (id: string) => {
    try {
      await supabase.from("partners").delete().eq("id", id);
      setDeletingId(null);
    } catch (err) {
      handleDbError(err, OperationType.DELETE, `partners/${id}`);
    }
  };

  const seedDefaults = async () => {
    const defaults = [
      { name: "GOOGLE", tier: "TITANIUM PARTNER", order: 1, logo: "https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" },
      { name: "AWS", tier: "CLOUD PARTNER", order: 2 },
      { name: "MLH", tier: "COMMUNITY PARTNER", order: 3 },
      { name: "NVIDIA", tier: "COMPUTE PARTNER", order: 4 },
      { name: "INTEL", tier: "SILICON PARTNER", order: 5 },
      { name: "GITHUB", tier: "SOURCE PARTNER", order: 6 },
      { name: "MISTRAL", tier: "LLM PARTNER", order: 7 },
      { name: "VERCEL", tier: "EDGE PARTNER", order: 8 }
    ];
    await supabase.from("partners").insert(defaults as any[]);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Strategic <span className="text-white/20">Partners</span></h2>
          <p className="text-white/40 text-sm mt-2">Manage sponsors and ecosystem partners.</p>
        </div>
        {partners.length === 0 && (
          <button onClick={seedDefaults} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
            Seed Defaults
          </button>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
        {editingPartner && (
           <div className="absolute inset-x-0 top-0 h-1 bg-accent-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Partner Name</label>
            <input 
              type="text" 
              placeholder="e.g. GOOGLE" 
              value={(editingPartner ? editingPartner.name : newPartner.name) || ""}
              onChange={(e) => editingPartner 
                ? setEditingPartner({...editingPartner, name: e.target.value})
                : setNewPartner({...newPartner, name: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Partnership Tier</label>
            <input 
              type="text" 
              placeholder="e.g. TITANIUM PARTNER" 
              value={(editingPartner ? editingPartner.tier : newPartner.tier) || ""}
              onChange={(e) => editingPartner
                ? setEditingPartner({...editingPartner, tier: e.target.value})
                : setNewPartner({...newPartner, tier: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Logo URL (Drive UC URL preferred)</label>
            <input 
              type="text" 
              placeholder="e.g. https://drive.google.com/uc?..." 
              value={(editingPartner ? editingPartner.logo : newPartner.logo) || ""}
              onChange={(e) => editingPartner 
                ? setEditingPartner({...editingPartner, logo: e.target.value})
                : setNewPartner({...newPartner, logo: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Display Order</label>
            <input 
              type="number" 
              value={(editingPartner ? editingPartner.order : newPartner.order) || 0}
              onChange={(e) => {
                const order = Number(e.target.value) || 0;
                editingPartner
                  ? setEditingPartner({...editingPartner, order})
                  : setNewPartner({...newPartner, order});
              }}
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
        </div>
        <div className="flex gap-4">
          {editingPartner ? (
            <>
              <button 
                onClick={updatePartner} 
                className="flex-1 py-5 bg-accent-500 text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-accent-400 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.2)]"
              >
                Save Changes
              </button>
              <button 
                onClick={() => setEditingPartner(null)} 
                className="px-8 py-5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all font-black uppercase text-xs tracking-widest"
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={addPartner} 
              className="w-full py-5 bg-accent-500 text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-accent-400 transition-all shadow-[0_20px_40px_rgba(34,197,94,0.2)] flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" /> Deploy Partner Entry
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {partners.map(p => (
          <PartnerItem 
            key={p.id} 
            p={p} 
            onEdit={(partner: any) => {
              setEditingPartner(partner);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            deletingId={deletingId}
            setDeletingId={setDeletingId}
            removePartner={removePartner}
          />
        ))}
      </div>
    </div>
  );
}

function LocationManager() {
  const [location, setLocation] = useState<any>(null);
  const [editData, setEditData] = useState({ name: '', address: '', city: '', mapUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return subscribeRow<any>("location", "venue", (row) => {
      if (row) {
        setLocation(row);
        setEditData({
          name: row.name || '',
          address: row.address || '',
          city: row.city || '',
          mapUrl: row.mapUrl || ''
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("location").upsert({
        id: "venue",
        ...editData,
        updatedAt: new Date().toISOString()
      });
      if (error) throw error;
    } catch (err) {
      handleDbError(err, OperationType.WRITE, "location/venue");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent-500" /></div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic">Venue <span className="text-white/20">Protocol</span></h2>
        <p className="text-white/40 text-sm mt-3">Configure the physical coordinates for Hacktoberfest Dehradun 2026.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 p-10 rounded-[40px] space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Venue name</label>
          <input 
            value={editData.name}
            onChange={(e) => setEditData({...editData, name: e.target.value})}
            placeholder="e.g. BFIT College, Dehradun"
            className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Address Details</label>
          <input 
            value={editData.address}
            onChange={(e) => setEditData({...editData, address: e.target.value})}
            placeholder="Detailed physical address"
            className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">City</label>
            <input 
              value={editData.city}
              onChange={(e) => setEditData({...editData, city: e.target.value})}
              placeholder="Dehradun"
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Google Maps Link</label>
            <input 
              value={editData.mapUrl}
              onChange={(e) => setEditData({...editData, mapUrl: e.target.value})}
              placeholder="https://maps.google.com/..."
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all text-white"
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={saving}
          className="w-full py-5 bg-accent-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-accent-400 transition-all shadow-[0_200px_40px_rgba(34,197,94,0.2)] flex items-center justify-center gap-3 mt-4"
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : "Broadcast Venue Update"}
        </button>
      </form>

      {location && (
        <div className="bg-accent-500/10 border border-accent-500/20 p-8 rounded-3xl">
          <p className="text-[11px] font-black uppercase tracking-widest text-accent-500 mb-2">Active Coordinates</p>
          <div className="space-y-1">
            <p className="text-xl font-black uppercase italic text-white">{location.name}</p>
            <p className="text-sm text-white/60">{location.address}, {location.city}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MarketingManager() {
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Queue and Error states
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [queueResults, setQueueResults] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoSkip, setAutoSkip] = useState(true);
  const [activeError, setActiveError] = useState<string | null>(null);

  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<any>(null);
  const [mailLogs, setMailLogs] = useState<any[]>([]);

  // State reference to safeguard asynchronous closures (so the loop doesn't get stale states)
  const queueStateRef = useRef({
    queue: [] as string[],
    currentIndex: -1,
    queueResults: [] as any[],
    isPaused: false,
    autoSkip: true,
  });

  useEffect(() => {
    queueStateRef.current = {
      queue,
      currentIndex,
      queueResults,
      isPaused,
      autoSkip,
    };
  }, [queue, currentIndex, queueResults, isPaused, autoSkip]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(api("/api/mail-logs"));
      const data = await res.json();
      if (Array.isArray(data)) {
        setMailLogs(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Polling logs every 10s
    return () => clearInterval(interval);
  }, []);

  const verifySmtp = async () => {
    setIsVerifying(true);
    setQueue([]);
    setQueueResults([]);
    setCurrentIndex(-1);
    setStatus("Verifying SMTP node connection...");
    try {
      const response = await fetch(api("/api/verify-smtp"));
      const data = await response.json();
      if (data.success) {
        setStatus("System Check: SMTP Node is ONLINE and authenticated.");
        setSmtpConfig(data.config);
      } else {
        setStatus(`System Alert: ${data.error} (${data.code || 'N/A'})`);
      }
    } catch (err) {
      setStatus("System Failure: Network error during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setStatus("Error: Provide a valid target for the diagnostic payload.");
      return;
    }
    setIsTesting(true);
    setStatus(`Dispatching diagnostic to ${testEmail}...`);
    try {
      const response = await fetch(api("/api/test-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail })
      });
      const data = await response.json();
      if (data.success) {
        setStatus(`Diagnostic SUCCESS: Check inbox of ${testEmail}.`);
        setTestEmail("");
        fetchLogs();
      } else {
        setStatus(`Diagnostic FAILURE: ${data.error}`);
      }
    } catch (err) {
      setStatus("Diagnostic Protocol Error: Connection refused.");
    } finally {
      setIsTesting(false);
    }
  };

  const runQueue = async (index: number, currentQueue: string[], currentResults: any[]) => {
    if (index >= currentQueue.length) {
      setSending(false);
      setCurrentIndex(-1);
      const successes = currentResults.filter(r => r.status === "sent").length;
      const failures = currentResults.filter(r => r.status === "failed").length;
      setStatus(`Signal broadcast complete: ${successes} Transmitted / ${failures} Rejections.`);
      setEmails("");
      fetchLogs();
      return;
    }

    setCurrentIndex(index);
    const email = currentQueue[index];
    setStatus(`Uplinking recruitment signal to: ${email} (${index + 1}/${currentQueue.length})...`);
    setActiveError(null);

    try {
      const response = await fetch(api("/api/send-marketing-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [email] })
      });

      const data = await response.json();
      const emailResult = data.results && data.results[0] 
        ? data.results[0] 
        : { email, status: data.success ? "sent" : "failed", error: data.error || "SMTP Rejection" };

      const updatedResults = [...currentResults, emailResult];
      setQueueResults(updatedResults);

      if (emailResult.status === "sent") {
        if (queueStateRef.current.isPaused) {
          setStatus(`Transmission paused manually following ${email}.`);
        } else {
          setTimeout(() => runQueue(index + 1, currentQueue, updatedResults), 150);
        }
      } else {
        const errorMsg = emailResult.error || "Address Rejection Event";
        console.warn(`SMTP error for ${email}:`, errorMsg);

        if (queueStateRef.current.autoSkip) {
          setStatus(`Alert: Ignored invalid email "${email}" and moving to next...`);
          setTimeout(() => runQueue(index + 1, currentQueue, updatedResults), 800);
        } else {
          setIsPaused(true);
          setActiveError(`Halted on "${email}": ${errorMsg}`);
          setStatus(`Signal delivery suspended. Action required.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message || "Uplink Failure";
      const emailResult = { email, status: "failed", error: errorMsg };
      const updatedResults = [...currentResults, emailResult];
      setQueueResults(updatedResults);

      if (queueStateRef.current.autoSkip) {
        setStatus(`Alert: Connection interrupted for ${email}. Auto-skipping...`);
        setTimeout(() => runQueue(index + 1, currentQueue, updatedResults), 800);
      } else {
        setIsPaused(true);
        setActiveError(`Network disconnect during transmission to "${email}": ${errorMsg}`);
        setStatus(`Signal delivery suspended. Action required.`);
      }
    }
  };

  const handleSend = async () => {
    const emailList = emails.split(/[\s,]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes("@"));
    
    if (emailList.length === 0) {
      setStatus("Error: No valid email targets identified.");
      return;
    }

    setSending(true);
    setIsPaused(false);
    setActiveError(null);
    setQueue(emailList);
    setQueueResults([]);
    setCurrentIndex(0);
    setStatus("Initiating recruitment broadcast queue...");

    // Spawn async queue
    await runQueue(0, emailList, []);
  };

  const handleSkipAndContinue = () => {
    setIsPaused(false);
    setActiveError(null);
    const nextIndex = currentIndex + 1;
    runQueue(nextIndex, queue, queueResults);
  };

  const handleRetryEmail = () => {
    setIsPaused(false);
    setActiveError(null);
    runQueue(currentIndex, queue, queueResults);
  };

  const handleContinueEmailing = () => {
    setIsPaused(false);
    setActiveError(null);
    runQueue(currentIndex, queue, queueResults);
  };

  const handlePauseQueue = () => {
    setIsPaused(true);
    setStatus("Paused transmission queue. Waiting for operator click to resume.");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Marketing <span className="text-white/20">Hub</span></h2>
          <p className="text-white/40 text-sm mt-2">Deploy recruitment signals to potential participants.</p>
        </div>
        <button 
          onClick={verifySmtp}
          disabled={isVerifying}
          className={cn(
            "px-6 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 border-2",
            (status && status.includes("ONLINE"))
              ? "bg-green-600/10 border-green-500 text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)]" 
              : "bg-accent-600 border-white/20 text-white shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:scale-[1.03] active:scale-95 animate-pulse"
          )}
        >
          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          <div className="flex flex-col items-start gap-0.5">
            <span>{(status && status.includes("ONLINE")) ? "System Status: ONLINE" : "System Check"}</span>
            {(!status || !status.includes("ONLINE")) && <span className="text-[8px] opacity-60">Validate Transmission Infrastructure</span>}
          </div>
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 p-10 rounded-[40px] space-y-8">
        {smtpConfig && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-500">
            {Object.entries(smtpConfig).map(([key, val]: [string, any]) => (
              <div key={key} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                 <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">{key.replace('SMTP_', '')}</p>
                 <p className={cn("text-[11px] font-bold uppercase tracking-tight truncate", val === 'MISSING' ? "text-red-500" : "text-white")}>{val}</p>
              </div>
            ))}
          </div>
        )}

        <div className="p-8 bg-black/40 border border-white/10 rounded-[32px] space-y-4">
           <div className="flex justify-between items-center">
              <div>
                 <h4 className="text-sm font-black uppercase tracking-tight italic text-white">Manual Pipe Test</h4>
                 <p className="text-[11px] uppercase font-bold text-white/30 tracking-widest">Verify individual delivery</p>
              </div>
           </div>
           <div className="flex gap-4">
              <input 
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test-receiver@example.com"
                className="flex-1 bg-black/40 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-accent-500 text-sm font-medium transition-all text-white"
              />
              <button 
                onClick={handleTestEmail}
                disabled={isTesting}
                className="px-8 py-4 bg-white/10 hover:bg-white text-white hover:text-black font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Send Diagnostic
              </button>
           </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-accent-500/10 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-accent-500" />
             </div>
             <div>
                <h3 className="text-lg font-black uppercase tracking-tight italic text-white">Recruitment Protocol</h3>
                <p className="text-[11px] uppercase font-bold text-white/30 tracking-widest">Send specialized hackathon invites</p>
             </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 ml-4">Target Email Addresses</label>
            <textarea 
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter emails (separated by commas or spaces) e.g. john@example.com, sara@dev.io"
              className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl outline-none focus:border-accent-500 text-sm font-medium transition-all text-white min-h-[200px] leading-relaxed"
            />
          </div>
        </div>

        <div className="p-6 bg-white/5 border border-dashed border-white/10 rounded-3xl space-y-4">
           <h4 className="text-[11px] font-black uppercase tracking-widest text-accent-500 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Signal Preview
           </h4>
           <div className="bg-black/60 p-4 rounded-xl space-y-2 border border-white/5">
              <p className="text-[12px] text-white/70 font-bold uppercase tracking-widest">Subject: SEATS FILLING FAST: Join Hacktoberfest Dehradun 2026!</p>
              <p className="text-sm text-white/40 italic leading-relaxed">
                "The grid is almost full. Hacktoberfest Dehradun 2026 is trending towards a sell-out as top-tier talent locks in. 85% capacity reached... Cash prizes, cash mentorship & more. Secure your slot now."
              </p>
           </div>
        </div>

        {/* Auto-Skip Configuration */}
        <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Error Mitigation Matrix</h4>
            <p className="text-[11px] text-white/40 uppercase font-bold">Configure automated fallback pipelines</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoSkip} 
              onChange={(e) => setAutoSkip(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
            <span className="ml-3 text-[11px] font-black uppercase text-white/50 tracking-widest">
              {autoSkip ? "Auto-Skip Failures" : "Pause on Error"}
            </span>
          </label>
        </div>

        {/* Live Broadcast Queue Progress Panel */}
        {queue.length > 0 && (
          <div className="p-8 bg-black/60 border border-accent-500/20 rounded-[32px] space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Loader2 className={cn("w-4 h-4 text-accent-500", currentIndex !== -1 && !isPaused && "animate-spin")} />
                  Queue Broadcast: {queueResults.length} / {queue.length} Transmissions
                </h4>
                <p className="text-[11px] text-white/30 uppercase font-black tracking-widest mt-1">
                  {currentIndex !== -1 ? `Active target: ${queue[currentIndex]}` : "Queue Processing Complete"}
                </p>
              </div>
              <div className="flex gap-2">
                {sending && !isPaused && (
                  <button 
                    onClick={handlePauseQueue}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
                  >
                    Pause Broadcast
                  </button>
                )}
                {isPaused && (
                  <button 
                    onClick={handleContinueEmailing}
                    className="px-4 py-2 bg-green-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all hover:bg-green-400"
                  >
                    Resume Broadcast
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-accent-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((queueResults.length / queue.length) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>{Math.round((queueResults.length / queue.length) * 100)}% Uploaded</span>
                <span className="flex gap-4">
                  <span className="text-green-500">{queueResults.filter(r => r.status === 'sent').length} Sent</span>
                  <span className="text-red-500">{queueResults.filter(r => r.status === 'failed').length} Failed</span>
                </span>
              </div>
            </div>

            {/* Error Detail / Action Row */}
            {activeError && (
              <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-500">SMTP Transport Halted</p>
                  <p className="text-xs text-white/80 font-mono italic leading-relaxed">{activeError}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button 
                    onClick={handleSkipAndContinue}
                    className="px-5 py-3 bg-white/10 hover:bg-white text-white hover:text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
                  >
                    Skip Address
                  </button>
                  <button 
                    onClick={handleRetryEmail}
                    className="px-5 py-3 bg-accent-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all hover:bg-accent-400"
                  >
                    Retry Address
                  </button>
                  <button 
                    onClick={handleContinueEmailing}
                    className="px-5 py-3 bg-green-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all hover:bg-green-400"
                  >
                    Continue Emailing
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {status && (
          <div className={cn(
            "p-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border shadow-2xl animate-in fade-in slide-in-from-bottom-2",
            status.includes("Error") || status.includes("Failure") || status.includes("Alert") || status.includes("Failed") || status.includes("suspended") ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-green-500/10 border-green-500/30 text-green-500"
          )}>
            {status}
          </div>
        )}

        {queueResults.length > 0 && queueResults.some(r => r.status === "failed") && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-red-500 mb-4">Diagnostic Log (Failures)</h4>
            {queueResults.filter(r => r.status === "failed").map((res: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4 text-[11px] font-mono text-red-500/70 border-b border-red-500/10 pb-2">
                <span>{res.email}</span>
                <span className="text-right italic">{res.error}</span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-8 border-t border-white/5 space-y-6">
           <div className="flex justify-between items-center px-2">
              <div>
                 <h3 className="text-sm font-black uppercase tracking-tight italic text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-white/40" /> Recent Transmissions
                 </h3>
                 <p className="text-[9px] uppercase font-bold text-white/20 tracking-widest mt-1">Live server event stream (Last 50)</p>
              </div>
              <button 
                onClick={fetchLogs}
                className="text-[9px] font-black uppercase tracking-widest text-info-400 hover:text-info-300 transition-all"
              >
                Force Sync
              </button>
           </div>

           <div className="overflow-hidden rounded-[24px] border border-white/5 bg-black/20">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-white/5">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Target</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Subject</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Time</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {mailLogs.length === 0 ? (
                         <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-white/10 text-[11px] uppercase font-black tracking-widest">No recent transmission data</td>
                         </tr>
                       ) : (
                         mailLogs.slice(0, 15).map((log, i) => (
                           <tr key={i} className="hover:bg-white/5 transition-all group">
                              <td className="px-6 py-4">
                                 <div className="text-[12px] font-bold text-white group-hover:text-info-400 transition-colors uppercase tracking-tight">{log.to}</div>
                                 <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mt-0.5">{log.category || 'general'}</div>
                              </td>
                              <td className="px-6 py-4 text-[11px] text-white/40 max-w-[200px] truncate">{log.subject}</td>
                              <td className="px-6 py-4">
                                 {log.success ? (
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-widest">
                                         <CheckCircle className="w-3 h-3" /> Transmitted
                                      </div>
                                      <div className="text-[9px] text-green-500/40 font-mono truncate max-w-[150px]">{log.response}</div>
                                   </div>
                                 ) : (
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-widest">
                                         <XCircle className="w-3 h-3" /> FAILED
                                      </div>
                                      <div className="text-[9px] text-red-500/50 font-mono italic max-w-[150px] truncate">{log.error}</div>
                                   </div>
                                 )}
                              </td>
                              <td className="px-6 py-4 text-right text-[11px] font-mono text-white/20 italic">
                                 {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A"}
                              </td>
                           </tr>
                         ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <button 
          onClick={handleSend}
          disabled={sending || !emails.trim()}
          className="w-full py-6 bg-accent-500 text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-accent-400 disabled:opacity-30 transition-all shadow-[0_20px_50px_rgba(34,197,94,0.2)] flex items-center justify-center gap-3"
        >
          {sending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
          {sending ? "TRANSMITTING SIGNAL..." : "DEPLOY RECRUITMENT BLAST"}
        </button>
      </div>
    </div>
  );
}

function GuestManager() {
  const [guests, setGuests] = useState<any[]>([]);
  const [newGuest, setNewGuest] = useState({ name: "", position: "", photo: "", order: 0 });
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    return subscribe("guests", setGuests, { orderBy: { column: "order" } },
      (error) => handleDbError(error, OperationType.GET, "guests"));
  }, []);

  const addGuest = async () => {
    if (!newGuest.name) return;
    try {
      const processedPhoto = getImageUrl(newGuest.photo);
      await supabase.from("guests").insert({
        ...newGuest,
        photo: processedPhoto
      });
      setNewGuest({ name: "", position: "", photo: "", order: guests.length + 1 });
    } catch (err) {
      handleDbError(err, OperationType.CREATE, "guests");
    }
  };

  const updateGuest = async () => {
    if (!editingGuest || !editingGuest.name) return;
    try {
      const processedPhoto = getImageUrl(editingGuest.photo);
      await supabase.from("guests").update({
        name: editingGuest.name,
        position: editingGuest.position,
        photo: processedPhoto,
        order: Number(editingGuest.order)
      }).eq("id", editingGuest.id);
      setEditingGuest(null);
    } catch (err) {
      handleDbError(err, OperationType.UPDATE, `guests/${editingGuest.id}`);
    }
  };

  const removeGuest = async (id: string) => {
    try {
      await supabase.from("guests").delete().eq("id", id);
      setDeletingId(null);
    } catch (err) {
      handleDbError(err, OperationType.DELETE, `guests/${id}`);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">Honoured <span className="text-white/20">Guests</span></h2>
        <p className="text-white/40 text-sm mt-2">Manage the lineup of special guests for Hacktoberfest Dehradun.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
        {editingGuest && (
           <div className="absolute inset-x-0 top-0 h-1 bg-accent-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Guest Name</label>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={(editingGuest ? editingGuest.name : newGuest.name) || ""}
              onChange={(e) => editingGuest 
                ? setEditingGuest({...editingGuest, name: e.target.value})
                : setNewGuest({...newGuest, name: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Position</label>
            <input 
              type="text" 
              placeholder="e.g. Chief Minister, Director" 
              value={(editingGuest ? editingGuest.position : newGuest.position) || ""}
              onChange={(e) => editingGuest 
                ? setEditingGuest({...editingGuest, position: e.target.value})
                : setNewGuest({...newGuest, position: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Photo URL (Drive/Unsplash)</label>
            <input 
              type="text" 
              placeholder="Link to photo" 
              value={(editingGuest ? editingGuest.photo : newGuest.photo) || ""}
              onChange={(e) => editingGuest 
                ? setEditingGuest({...editingGuest, photo: e.target.value})
                : setNewGuest({...newGuest, photo: e.target.value})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Display Order</label>
            <input 
              type="number" 
              placeholder="0" 
              value={(editingGuest ? editingGuest.order : newGuest.order) || 0}
              onChange={(e) => editingGuest 
                ? setEditingGuest({...editingGuest, order: e.target.value})
                : setNewGuest({...newGuest, order: Number(e.target.value)})
              }
              className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl outline-none focus:border-accent-500 text-sm font-bold transition-all"
            />
          </div>
        </div>
        <div className="flex gap-3">
          {editingGuest ? (
            <>
              <button onClick={updateGuest} className="flex-1 py-5 bg-accent-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-accent-400 transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Update Protocol
              </button>
              <button onClick={() => setEditingGuest(null)} className="px-8 py-5 bg-white/5 text-white/50 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/10 transition-all">
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={addGuest} 
              disabled={!newGuest.name}
              className="w-full py-5 bg-accent-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-accent-400 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Deploy Guest Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guests.map((guest) => (
          <div key={guest.id} className="bg-white/5 border border-white/10 rounded-[40px] p-6 hover:border-accent-500/30 transition-all group relative">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl overflow-hidden bg-black/40 border border-white/10">
                <img 
                  src={getImageUrl(guest.photo) || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&fit=crop"} 
                  alt={guest.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-black uppercase italic tracking-tighter text-white leading-tight">{guest.name}</h3>
                <p className="text-accent-500 text-[11px] font-black uppercase tracking-widest mt-1">{guest.position}</p>
                <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-2 bg-white/5 px-2 py-1 rounded-md inline-block">Order: {guest.order}</div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/5 flex gap-2">
              <button onClick={() => setEditingGuest(guest)} className="flex-1 py-3 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button 
                onClick={() => deletingId === guest.id ? removeGuest(guest.id) : setDeletingId(guest.id)} 
                className={cn(
                  "flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  deletingId === guest.id ? "bg-red-500 text-white" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                )}
              >
                <Trash2 className="w-3.5 h-3.5" /> {deletingId === guest.id ? "Confirm?" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

