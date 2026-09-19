import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { db, auth, googleProvider, handleFirestoreError, OperationType } from "../lib/firebase";
import { User, signInWithPopup } from "firebase/auth";
import { collection, getDocs, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import {
  Trophy,
  Cpu,
  Users,
  Calendar,
  MapPin,
  Lightbulb,
  HeartPulse,
  Search,
  Sparkles,
  Loader2,
  UserCheck,
  Lock,
  Briefcase,
  ArrowRight
} from "lucide-react";
import { cn } from "../lib/utils";

/** Doors open 30 May 2026 09:00 IST, demos wrap 31 May 18:00 IST. Drives the countdown. */
const EVENT_START = new Date("2026-05-30T09:00:00+05:30");
const EVENT_END = new Date("2026-05-31T18:00:00+05:30");

const trackIcons: Record<string, any> = {
  "EdTech": {
    icon: Lightbulb,
    color: "text-info-400",
    bg: "bg-info-400/10",
    ring: "border-info-400/30",
    problems: ["Academic Performance & At-Risk Student Detection", "Industry-Ready Skill Tracking Gap"]
  },
  "Healthcare": {
    icon: HeartPulse,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    ring: "border-rose-400/30",
    problems: ["Fragmented Medical Records", "Real-Time Emergency Resource Discovery"]
  },
  "On-Demand Local Services": {
    icon: Search,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "border-amber-400/30",
    problems: ["Fragmented Local Service Access", "Trust and Verification Gap"]
  }
};

/** Firestore stores full track titles, so match the theme on a keyword. */
const themeFor = (name: string = "") => {
  const key = Object.keys(trackIcons).find(k =>
    name.toLowerCase().includes(k.toLowerCase().split(" ")[0])
  );
  return (key && trackIcons[key]) || {
    icon: Sparkles,
    color: "text-accent-400",
    bg: "bg-accent-400/10",
    ring: "border-accent-400/30"
  };
};

const getImageUrl = (url: string) => {
  if (!url) return "";
  const idMatch = url.match(/[-\w]{25,}/);
  if (url.includes('drive.google.com') && idMatch) {
    return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
  }
  return url;
};

const GLOW_W = 760;
const GLOW_H = 560;

/**
 * Moves the hero's ambient glow toward the pointer.
 *
 * Writes straight to `style.transform` rather than React state — pointermove
 * fires far faster than 60fps and re-rendering the landing page on each event
 * would drop frames. The trailing ease is a CSS transition on the element, so
 * it runs on the compositor: no rAF loop to throttle, and the global
 * prefers-reduced-motion rule already collapses it to a static glow.
 */
function useCursorGlow(enabled: boolean) {
  const hostRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const glow = glowRef.current;
    if (!host || !glow) return;

    const place = (x: number, y: number) => {
      glow.style.transform = `translate3d(${x - GLOW_W / 2}px, ${y - GLOW_H / 2}px, 0)`;
    };
    // Resting spot: used for touch, reduced motion, first paint and on exit.
    const rest = () => place(host.clientWidth / 2, host.clientHeight * 0.3);
    rest();

    // Nothing to follow on a touch screen.
    if (!enabled || !window.matchMedia("(pointer: fine)").matches) return;

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      place(e.clientX - r.left, e.clientY - r.top);
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", rest, { passive: true });
    window.addEventListener("resize", rest);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", rest);
      window.removeEventListener("resize", rest);
    };
  }, [enabled]);

  return { hostRef, glowRef };
}

/** Small mono eyebrow used to open every section. */
const Eyebrow = ({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "info" }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className={cn("w-1.5 h-1.5 rounded-full", tone === "accent" ? "bg-accent-400" : "bg-info-400")} />
    <span className={cn("font-mono text-[11px] tracking-[0.25em] uppercase", tone === "accent" ? "text-accent-400" : "text-info-400")}>
      {children}
    </span>
  </div>
);

const SectionHead = ({ eyebrow, title, sub, tone }: { eyebrow: string; title: ReactNode; sub?: string; tone?: "accent" | "info" }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
    <div className="max-w-2xl">
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2 className="font-display text-4xl md:text-5xl font-bold leading-[1.05]">{title}</h2>
    </div>
    {sub && <p className="max-w-sm text-white/50 text-[15px] leading-relaxed">{sub}</p>}
  </div>
);

function Countdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = EVENT_START.getTime() - now;
  // Past the start there is nothing to count down to — a frozen 00:00:00:00
  // reads as broken, so say what phase the event is actually in.
  if (diff <= 0) {
    const live = now < EVENT_END.getTime();
    return (
      <div className="rounded-xl border border-white/10 bg-canvas/70 px-4 py-5 text-center">
        {live ? (
          <>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-accent-300">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" aria-hidden="true" />
              Hacking in progress
            </span>
            <p className="text-white/45 text-[13px] mt-2">Wraps up 31 May 2026, 18:00 IST.</p>
          </>
        ) : (
          <>
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/45">Event concluded</span>
            <p className="text-white/45 text-[13px] mt-2">Held 30&ndash;31 May 2026 at BFIT College, Dehradun.</p>
          </>
        )}
      </div>
    );
  }

  const units = [
    { label: "Days", value: Math.floor(diff / 86400000) },
    { label: "Hours", value: Math.floor(diff / 3600000) % 24 },
    { label: "Mins", value: Math.floor(diff / 60000) % 60 },
    { label: "Secs", value: Math.floor(diff / 1000) % 60 }
  ];

  return (
    <div>
      {/* Exact deadline as text \u2014 the ticker is decoration layered on top of it. */}
      <p className="sr-only">Event begins 30 May 2026 at 09:00 IST.</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
        {units.map((u) => (
          <div key={u.label} className="rounded-xl border border-white/10 bg-canvas/70 px-1 py-3 text-center">
            <div className="font-mono nums text-2xl sm:text-[28px] font-bold text-white leading-none">
              {String(u.value).padStart(2, "0")}
            </div>
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-white/35 mt-1.5">{u.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PartnerLogo = ({ p }: { p: any; key?: any }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="group flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-surface/60 p-7 transition-colors hover:border-accent-500/35">
      {p.logo && !imgError ? (
        <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-white/5 p-3">
          <img
            src={getImageUrl(p.logo)}
            alt={p.name}
            className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-white/5">
          <span className="font-display text-2xl font-bold text-white/20">{p.name.charAt(0)}</span>
        </div>
      )}
      <div className="text-center min-w-0 w-full">
        <h3 className="font-display text-base font-bold text-white/85 group-hover:text-white transition-colors truncate">{p.name}</h3>
        <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-accent-500/70 mt-1">{p.tier}</p>
      </div>
    </div>
  );
};

export default function LandingPage({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [eventTeam, setEventTeam] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventLocation, setEventLocation] = useState<any>(null);

  useEffect(() => {
    // Location
    const unsubLocation = onSnapshot(doc(db, "location", "venue"), (snap) => {
      if (snap.exists()) {
        setEventLocation(snap.data());
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, "location/venue"));

    // Tracks
    getDocs(collection(db, "tracks")).then(snap => {
      setTracks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Event Team
    getDocs(collection(db, "event_team")).then(snap => {
      setEventTeam(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Mentors
    getDocs(collection(db, "mentors")).then(snap => {
      setMentors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Rounds
    const roundsQ = query(collection(db, "rounds"), orderBy("order", "asc"));
    onSnapshot(roundsQ, (snap) => {
      setRounds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, "rounds"));

    // Partners
    const partnersQ = query(collection(db, "partners"), orderBy("order", "asc"));
    onSnapshot(partnersQ, (snap) => {
      setPartners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, "partners"));

    setLoading(false);

    return () => {
      unsubLocation();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/dashboard");
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        setLoginError("Login popup was blocked. Please allow popups or open in a new tab.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("Login popup was closed before completion.");
      } else {
        setLoginError("Google authentication failed. Please try again.");
        console.error("Login failed", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const venue = eventLocation ? `${eventLocation.name}, ${eventLocation.city || 'Dehradun'}` : "BFIT College, Dehradun";
  const { hostRef, glowRef } = useCursorGlow(!reduceMotion);

  const rise: any = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" } };

  const defaultRounds = [
    { r: 1, title: "Ideation Sprint", desc: "Teams brainstorm and pitch initial ideas in 2-3 minutes based on problem themes." },
    { r: 2, title: "Research & Feasibility", desc: "Validating market need, existing solutions, and feasibility of the chosen idea." },
    { r: 3, title: "System Design Round", desc: "Architecture planning: tech stack selection, API design, and flow diagram creation." },
    { r: 4, title: "Development Sprint", desc: "The main 24-hour hackathon phase. Building the MVP / working prototype." },
    { r: 5, title: "Surprise Challenge", desc: "Adding twists or debugging tests to check teams' adaptability and real-world thinking." },
    { r: 6, title: "Final Demo & Pitch", desc: "Teams present their solution, demo, and future scope in 5-8 minutes." }
  ];

  return (
    <div>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section ref={hostRef} className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 px-5 sm:px-6">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" aria-hidden="true" />
        <div
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 w-[760px] h-[560px] rounded-full bg-accent-500/14 blur-[150px] will-change-transform transition-transform duration-[600ms] ease-out"
        />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-14 items-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center lg:text-left min-w-0"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/25 bg-accent-500/8 px-3.5 py-1.5 mb-7 max-w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
              <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-accent-300">
                Uttarakhand's Largest Hybrid Hackathon
              </span>
            </div>

            {/* Fluid size: "Dehradun" is twice as long as the old city name, so the
                headline is clamped to the viewport instead of a fixed 140px. */}
            <h1 className="font-display font-bold leading-[0.95] mb-6 text-[clamp(2.75rem,10vw,5.25rem)]">
              Hacktoberfest
              <br />
              <span className="text-accent-400">Dehradun</span>{" "}
              <span className="text-white/25">2026</span>
            </h1>

            <p className="text-white/55 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
              A 24-hour build sprint where student engineers ship real products with
              Generative AI — hosted by <span className="text-white font-medium">BFIT College Dehradun</span>.
            </p>

            <dl className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 mb-9">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-accent-400 shrink-0" aria-hidden="true" />
                <div className="text-left">
                  <dt className="sr-only">Dates</dt>
                  <dd className="text-sm font-medium text-white">30-31 May 2026</dd>
                  <dd className="text-[11px] text-white/35">Start time sent by email</dd>
                </div>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-accent-400 shrink-0" aria-hidden="true" />
                <div className="text-left min-w-0">
                  <dt className="sr-only">Venue</dt>
                  <dd className="text-sm font-medium text-white break-words">{venue}</dd>
                  <dd className="text-[11px] text-white/35">Uttarakhand, India</dd>
                </div>
              </div>
            </dl>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              {user ? (
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-accent-500 text-black font-bold text-sm hover:bg-accent-400 transition-colors w-full sm:w-auto"
                >
                  Open dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </Link>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-accent-500 text-black font-bold text-sm hover:bg-accent-400 transition-colors disabled:opacity-60 w-full sm:w-auto"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Signing in...
                    </>
                  ) : (
                    "Hacker sign in"
                  )}
                </button>
              )}
              <a
                href="#tracks"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-white/15 text-white/75 font-bold text-sm hover:bg-white/5 hover:text-white transition-colors w-full sm:w-auto"
              >
                View tracks
              </a>
            </div>

            <p className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] tracking-wide text-white/35">
              <Lock className="w-3.5 h-3.5 text-accent-500/70" aria-hidden="true" />
              Registrations are closed
            </p>

            {loginError && (
              <p role="alert" className="mt-5 text-[13px] text-rose-300 bg-rose-500/10 border border-rose-500/25 px-4 py-2.5 rounded-xl">
                {loginError}
              </p>
            )}
          </motion.div>

          {/* Countdown + partner rail */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5 min-w-0"
          >
            <div className="rounded-2xl border border-white/10 bg-surface/50 backdrop-blur-sm p-6">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/35 mb-4">
                {Date.now() < EVENT_START.getTime() ? "Kickoff in" : "Status"}
              </p>
              <Countdown />
              <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <div className="font-display text-2xl font-bold text-white nums">24<span className="text-accent-400">h</span></div>
                  <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/35 mt-0.5">Build window</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-white nums">200<span className="text-accent-400">+</span></div>
                  <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/35 mt-0.5">Teams</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-5 rounded-2xl bg-white px-6 py-4">
              <img
                src="https://lh3.googleusercontent.com/d/18XbNtByUmIUI33wkX21UD4Bib_K6Cxru"
                alt="Major League Hacking"
                className="h-8 md:h-9 object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="h-7 w-px bg-black/10" aria-hidden="true" />
              <img
                src="https://lh3.googleusercontent.com/d/1FN1jqo85kvF9uty6toFoP6VsRUicgI9M"
                alt="Build with AI"
                className="h-8 md:h-9 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────── PERKS ───────────────────────── */}
      <section className="px-5 sm:px-6 py-16 border-y border-white/10 bg-surface/30">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
          {[
            { icon: Trophy, title: "Google swag kits", desc: "Exclusive Google-branded merchandise and collectibles for top performers." },
            { icon: Cpu, title: "Cloud credits", desc: "Free Google Cloud credits to build and deploy your AI-powered solutions." },
            { icon: Briefcase, title: "Internship tracks", desc: "Selected participants get internship opportunities and high-value rewards." }
          ].map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} {...rise} transition={{ duration: 0.4 }} className="flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-accent-400" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold mb-1.5">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── TRACKS ───────────────────────── */}
      <section id="tracks" className="px-5 sm:px-6 py-20 md:py-24 max-w-6xl mx-auto scroll-mt-20">
        <SectionHead
          eyebrow="Choose your focus"
          title={<>Hackathon <span className="text-white/25">tracks</span></>}
          sub="Three high-impact domains, each with pre-defined problem statements sourced from real gaps in the region."
        />

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-accent-500" aria-label="Loading tracks" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-white/35 text-sm">Tracks will be published closer to the event.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {tracks.map((track, i) => {
              const theme = themeFor(track.name);
              const Icon = theme.icon;
              return (
                <motion.article
                  key={track.id}
                  {...rise}
                  transition={{ duration: 0.4, delay: reduceMotion ? 0 : i * 0.06 }}
                  className="group relative flex flex-col rounded-2xl border border-white/10 bg-surface/50 p-6 transition-colors hover:border-white/20"
                >
                  <div className={cn("inline-flex w-11 h-11 rounded-xl items-center justify-center border mb-5", theme.bg, theme.ring)}>
                    <Icon className={cn("w-5 h-5", theme.color)} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2.5">{track.name}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-6">{track.description}</p>

                  <div className="mt-auto pt-5 border-t border-white/10">
                    {theme.problems?.length > 0 && (
                      <div className="space-y-2.5 mb-4">
                        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/30">Problem statements</p>
                        {theme.problems.map((problem: string, k: number) => (
                          <div key={k} className="flex items-start gap-2.5">
                            <span className={cn("w-1 h-1 rounded-full mt-2 shrink-0", theme.color.replace('text-', 'bg-'))} />
                            <span className="text-[13px] text-white/65 leading-snug">{problem}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
                      <Lock className="w-3 h-3" aria-hidden="true" /> Locked until kickoff
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────────────────────── SCHEDULE / ROUNDS ───────────────────────── */}
      <section id="schedule" className="px-5 sm:px-6 py-20 md:py-24 border-y border-white/10 bg-surface/30 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <SectionHead
            eyebrow="How the 24 hours run"
            title={<>Event <span className="text-white/25">rounds</span></>}
            sub="Six checkpoints from first idea to final demo. Each one is scored."
          />

          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(rounds.length > 0 ? rounds : defaultRounds).map((round: any, i: number) => {
              const order = round.order ?? round.r;
              const name = round.name ?? round.title;
              const desc = round.description ?? round.desc;
              return (
                <motion.li
                  key={round.id ?? order}
                  {...rise}
                  transition={{ duration: 0.4, delay: reduceMotion ? 0 : i * 0.05 }}
                  className="relative rounded-2xl border border-white/10 bg-canvas/60 p-6 hover:border-accent-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="font-mono nums text-[11px] tracking-[0.2em] text-accent-500/70">
                      {String(order).padStart(2, '0')}
                    </span>
                    {round.isActive && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/12 border border-accent-500/25 px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" aria-hidden="true" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-accent-300">Live</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{name}</h3>
                  <p className="text-white/45 text-[13px] leading-relaxed">{desc}</p>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ───────────────────────── MENTORS ───────────────────────── */}
      <section id="mentors" className="px-5 sm:px-6 py-20 md:py-24 max-w-6xl mx-auto scroll-mt-20">
        <SectionHead
          tone="info"
          eyebrow="Strategic mentorship"
          title={<>Your <span className="text-white/25">mentors</span></>}
          sub="Industry engineers on the floor for the full 24 hours, reviewing architecture and unblocking teams."
        />

        {mentors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {mentors.map((mentor, i) => (
              <motion.div
                key={mentor.id}
                {...rise}
                transition={{ duration: 0.4, delay: reduceMotion ? 0 : i * 0.04 }}
                className="rounded-2xl border border-white/10 bg-surface/50 p-4 hover:border-info-400/30 transition-colors min-w-0"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-white/5 mb-3.5">
                  {mentor.photo
                    ? <img src={mentor.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full flex items-center justify-center"><UserCheck className="w-8 h-8 text-white/12" aria-hidden="true" /></div>}
                </div>
                <h3 className="font-display text-sm font-bold leading-tight mb-1.5">{mentor.name}</h3>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-info-400">{mentor.designation || 'Expert'}</p>
                <p className="text-[11px] text-white/35 mt-0.5 truncate">{mentor.company}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-white/35 text-sm">Mentor line-up is being finalised.</p>
          </div>
        )}
      </section>

      {/* ───────────────────────── EVENT TEAM ───────────────────────── */}
      <section id="team" className="px-5 sm:px-6 py-20 md:py-24 border-y border-white/10 bg-surface/30 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <SectionHead
            eyebrow="Event operations"
            title={<>Organising <span className="text-white/25">team</span></>}
            sub="The BFIT College Dehradun crew running logistics, judging and hacker support."
          />

          {eventTeam.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {eventTeam.map((member, i) => (
                <motion.div
                  key={member.id}
                  {...rise}
                  transition={{ duration: 0.4, delay: reduceMotion ? 0 : i * 0.04 }}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-canvas/60 p-4 hover:border-accent-500/30 transition-colors min-w-0"
                >
                  <div className="shrink-0 w-14 h-14 rounded-full overflow-hidden bg-white/5 border border-white/10">
                    {member.photo
                      ? <img src={member.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center"><Users className="w-5 h-5 text-accent-500/40" aria-hidden="true" /></div>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold leading-tight truncate">{member.name}</h3>
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-accent-400 mt-1 truncate">
                      {member.designation || 'Specialist'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/35 text-sm">Team roster is being finalised.</p>
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────── PARTNERS ───────────────────────── */}
      <section className="px-5 sm:px-6 py-20 md:py-24 max-w-6xl mx-auto">
        <SectionHead eyebrow="Backed by" title={<>Strategic <span className="text-white/25">partners</span></>} />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {partners.length > 0 ? (
            partners.map((p) => <PartnerLogo key={p.id} p={p} />)
          ) : (
            [
              { name: "Google", tier: "Titanium" },
              { name: "AWS", tier: "Cloud" },
              { name: "MLH", tier: "Community" },
              { name: "NVIDIA", tier: "Compute" },
              { name: "Intel", tier: "Silicon" },
              { name: "GitHub", tier: "Source" },
              { name: "Mistral", tier: "LLM" },
              { name: "Vercel", tier: "Edge" }
            ].map((p) => (
              <div key={p.name} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface/40 p-7">
                <h3 className="font-display text-base font-bold text-white/35">{p.name}</h3>
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-accent-500/40">{p.tier}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ───────────────────────── CLOSING CTA ───────────────────────── */}
      <section className="px-5 sm:px-6 pb-24">
        <div className="relative max-w-5xl mx-auto overflow-hidden rounded-3xl border border-accent-500/20 bg-surface/60 px-6 py-14 md:px-16 md:py-20 text-center">
          <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] max-w-full h-[300px] bg-accent-600/15 blur-[120px]" aria-hidden="true" />
          <div className="relative flex flex-col items-center">
            <Eyebrow>Built in collaboration</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 leading-[1.05]">
              Innovation <span className="text-white/25">awaits</span>
            </h2>
            <p className="text-white/55 text-base md:text-lg max-w-xl mx-auto mb-9 leading-relaxed">
              Google swag kits, Google Cloud credits and internship opportunities for
              selected members — on top of 24 hours with mentors who ship for a living.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {["Swag & credits", "Internship roles", "24h build sprint", "MLH member event"].map((tag) => (
                <span key={tag} className="rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
