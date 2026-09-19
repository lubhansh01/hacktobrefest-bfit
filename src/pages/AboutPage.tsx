import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { subscribe, subscribeRow } from "../lib/supabase";
import { cn } from "../lib/utils";
import { 
  Users, 
  Settings, 
  MapPin, 
  Calendar, 
  Trophy, 
  Rocket, 
  Heart, 
  Star,
  Clock,
  Layout,
  Terminal,
  Cpu,
  Medal
} from "lucide-react";

const OptimizedImage = ({ src, alt, className, imgClassName, ...props }: any) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setError(true);
  }, [src]);
  
  return (
    <div className={cn("relative overflow-hidden bg-white/5", className)}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent shimmer-effect animate-shimmer" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 animate-pulse">Establishing Connection</div>
          </div>
        </div>
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/45 text-[10px] font-bold uppercase tracking-widest">
          Visual Link Broken
        </div>
      ) : (
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ 
            opacity: isLoaded ? 1 : 0,
            scale: isLoaded ? 1 : 1.05,
            filter: isLoaded ? "blur(0px)" : "blur(10px)"
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("w-full h-full", imgClassName || "object-cover", isLoaded ? "" : "invisible")}
          {...props}
        />
      )}
    </div>
  );
};

const AgendaItem = ({ time, event, description }: any) => (
  <div className="flex gap-6 pb-12 border-l border-accent-500/20 ml-4 relative">
    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-accent-500 rounded-full border-4 border-black" />
    <div className="flex-1 pl-8">
      <div className="font-mono text-[13px] text-accent-400 tracking-wide mb-1.5 nums">{time}</div>
      <h3 className="font-display text-lg font-bold text-white mb-1.5">{event}</h3>
      <p className="text-white/50 text-[14px] leading-relaxed">{description}</p>
    </div>
  </div>
);

const SpeakerCard = ({ name, role, company, photo }: any) => {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="group relative bg-[#0a0a0a] border border-white/5 rounded-[40px] overflow-hidden hover:border-accent-500/30 transition-all duration-500 shadow-2xl">
      <div className="aspect-square overflow-hidden bg-white/5 relative flex items-center justify-center">
        {!imgError ? (
          <>
            <motion.div
              animate={{ opacity: isLoaded ? 0 : 1 }}
              className="absolute inset-0 z-10 bg-white/5"
            >
              <div className="w-full h-full animate-pulse bg-white/5" />
            </motion.div>
            <motion.img 
              src={getImageUrl(photo) || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600&h=600"} 
              alt={name} 
              onLoad={() => setIsLoaded(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 1.05 }}
              transition={{ duration: 0.7 }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="text-4xl font-black text-white/10 uppercase italic mb-12">{name.charAt(0)}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
           <Cpu className="w-12 h-12 text-white" />
        </div>
      </div>
      <div className="p-8 relative z-10 border-t border-white/5">
        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-1 leading-none">{name}</h4>
        <div className="text-sm font-bold uppercase tracking-widest text-accent-500 mb-4">{role}</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-black flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-accent-500 rounded-full" />
          {company}
        </div>
      </div>
    </div>
  );
};

const GuestCard = ({ name, position, photo }: any) => {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="group relative bg-[#0a0a0a] border border-white/5 rounded-[40px] overflow-hidden hover:border-accent-500/30 transition-all duration-500 shadow-2xl">
      <div className="aspect-square overflow-hidden bg-white/5 relative flex items-center justify-center">
        {!imgError ? (
          <>
            <motion.div
              animate={{ opacity: isLoaded ? 0 : 1 }}
              className="absolute inset-0 z-10 bg-white/5"
            >
              <div className="w-full h-full animate-pulse bg-white/5" />
            </motion.div>
            <motion.img 
              src={getImageUrl(photo) || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600&h=600"} 
              alt={name} 
              onLoad={() => setIsLoaded(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 1.05 }}
              transition={{ duration: 0.7 }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="text-4xl font-black text-white/10 uppercase italic mb-12">{name.charAt(0)}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        <div className="absolute top-6 left-6 opacity-20 group-hover:opacity-40 transition-opacity">
           <Medal className="w-12 h-12 text-white" />
        </div>
      </div>
      <div className="p-8 relative z-10 border-t border-white/5">
        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-1 leading-none">{name}</h4>
        <div className="text-sm font-bold uppercase tracking-widest text-accent-500">{position}</div>
      </div>
    </div>
  );
};

const getImageUrl = (url: string) => {
  if (!url) return "";
  const idMatch = url.match(/[-\w]{25,}/);
  if (url.includes('drive.google.com') && idMatch) {
    return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
  }
  return url;
};

const SponsorLogo = ({ name, tier, logo }: any) => {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-white/5 rounded-[40px] group hover:bg-white/[0.05] transition-all">
      {logo && !imgError ? (
        <div className="w-24 h-24 mb-6 flex items-center justify-center p-4 bg-white/5 rounded-3xl border border-white/10 group-hover:border-accent-500/30 transition-all relative overflow-hidden">
          {!isLoaded && (
            <div className="absolute inset-0 bg-white/5 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer-effect" />
          )}
          <motion.img 
            src={getImageUrl(logo)} 
            alt={name} 
            onLoad={() => setIsLoaded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            className="max-w-full max-h-full object-contain transition-all duration-500" 
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-24 h-24 mb-6 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10 group-hover:border-accent-500/30 transition-all">
           <span className="text-3xl font-black text-white/10 uppercase italic">{name.charAt(0)}</span>
        </div>
      )}
      
      <h4 className="text-xl font-black uppercase italic tracking-tighter text-white group-hover:text-accent-500 transition-colors mb-2">
        {name}
      </h4>
      
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 group-hover:text-accent-500/60 transition-colors">
        {tier} Partner
      </div>
    </div>
  );
};

export default function AboutPage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [eventLocation, setEventLocation] = useState<any>(null);

  useEffect(() => {
    const unsubs = [
      subscribeRow("location", "venue", (row) => row && setEventLocation(row)),
      subscribe("timeline", setTimeline, { orderBy: { column: "order" } }),
      subscribe("speakers", setSpeakers, { orderBy: { column: "createdAt" } }),
      subscribe("guests", setGuests, { orderBy: { column: "order" } }),
      subscribe("partners", setPartners, { orderBy: { column: "order" } }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  return (
    <div className="pt-28 pb-24">
      {/* Hero Section */}
      <section className="px-5 sm:px-6 mb-24 relative">
        <div className="absolute inset-x-0 top-0 h-80 bg-grid [mask-image:radial-gradient(ellipse_60%_100%_at_50%_0%,black,transparent)]" aria-hidden="true" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-80 bg-accent-600/10 blur-[120px] -z-10" aria-hidden="true" />
        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-accent-500/25 bg-accent-500/8 px-3.5 py-1.5 mb-7"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent-300">Identity &amp; purpose</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display font-bold leading-[0.95] text-[clamp(2.5rem,8vw,4.5rem)]"
          >
            About <span className="text-white/25">Hacktoberfest</span>
          </motion.h1>
          <p className="text-white/50 text-lg leading-relaxed mt-6 max-w-xl mx-auto">
            Uttarakhand&rsquo;s largest student build sprint, organised by BFIT College Dehradun.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="px-6 max-w-7xl mx-auto mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold leading-[1.1]">
              24 hours at the <span className="text-accent-400">AI frontier</span>
            </h2>
            <p className="text-lg text-white/55 leading-relaxed">
              Hacktoberfest Dehradun is more than a competition. It is a working engineering lab
              where students from across Uttarakhand ship real products with Generative AI &mdash;
              with mentors, compute and a hard deadline.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-8">
              <div className="p-6 bg-surface/60 border border-white/10 rounded-2xl">
                <div className="font-display text-3xl font-bold text-white mb-1.5">200+</div>
                <div className="font-mono text-[10px] uppercase text-white/45 tracking-[0.15em] leading-relaxed">
                  Teams registered <br /> till now and still counting
                </div>
              </div>
              <div className="p-6 bg-surface/60 border border-white/10 rounded-2xl">
                <div className="font-display text-3xl font-bold text-white mb-1.5">500+</div>
                <div className="font-mono text-[10px] uppercase text-white/45 tracking-[0.15em] leading-relaxed">
                  Community <br /> Members
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-accent-600/5 border border-accent-500/10 rounded-[60px] flex items-center justify-center p-12 overflow-hidden group">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 border-[40px] border-accent-500/5 border-dashed rounded-full" 
               />
               <Layout className="w-48 h-48 text-accent-500/20 group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Place / Venue */}
      <section className="px-5 sm:px-6 max-w-6xl mx-auto mb-24">
       <div className="bg-surface/60 border border-white/10 rounded-3xl overflow-hidden p-8 md:p-14 relative">
        <div className="absolute top-0 right-0 p-12 pointer-events-none opacity-5">
           <MapPin className="w-64 h-64 text-white" />
        </div>
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2.5 mb-5">
             <MapPin className="w-4 h-4 text-accent-400" aria-hidden="true" />
             <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent-400">The venue</span>
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6 leading-[1.05]">
            Dehradun, <span className="text-white/25">Uttarakhand</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed mb-9 max-w-xl">
            Set in the Doon valley &mdash; one of North India&rsquo;s densest clusters of engineering
            campuses. The floor runs for the full 24 hours with high-speed uplink, backup
            power and a dedicated hacker lounge.
          </p>
          <div className="p-6 bg-canvas/70 border border-white/10 rounded-2xl inline-block max-w-md">
             <div className="font-display text-base font-bold text-white mb-1.5">
              {eventLocation ? `${eventLocation.name}, ${eventLocation.city || 'Dehradun'}` : "BFIT College, Dehradun"}
             </div>
             <div className="text-[13px] text-white/45 leading-relaxed">
              {eventLocation ? eventLocation.address : "Full address is sent to selected teams by email."}
             </div>
             {eventLocation?.mapUrl && (
               <a 
                 href={eventLocation.mapUrl} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 mt-4 text-[13px] font-medium text-accent-400 hover:text-accent-300 transition-colors"
               >
                 Open in Maps <Rocket className="w-3.5 h-3.5" aria-hidden="true" />
               </a>
             )}
          </div>
        </div>
       </div>
      </section>

      {/* Agenda Section */}
      <section className="px-6 max-w-7xl mx-auto mb-32">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold leading-[1.05] mb-4">The <span className="text-white/25">agenda</span></h2>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/40">Two days, phase by phase</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-20">
          <div>
            <div className="text-xs font-black text-accent-500 uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
               <div className="w-8 h-[1px] bg-accent-500" /> DAY 01
            </div>
            {timeline.length > 0 ? (
              timeline.filter(item => (item.day || "1") === "1").map((item) => (
                <AgendaItem 
                  key={item.id}
                  time={item.time}
                  event={item.event}
                  description={item.description || "Operational phase active."}
                />
              ))
            ) : (
              <>
                <AgendaItem 
                  time="09:00 AM"
                  event="Check-in & Uplink"
                  description="Hardware verification and team protocol initialization."
                />
                <AgendaItem 
                  time="11:00 AM"
                  event="Opening Briefing"
                  description="Keynote by AI engineers and problem node reveals."
                />
              </>
            )}
          </div>
          <div className="md:mt-32">
            <div className="text-xs font-black text-accent-500 uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
               <div className="w-8 h-[1px] bg-accent-500" /> DAY 02
            </div>
            {timeline.length > 0 ? (
              timeline.filter(item => item.day === "2").map((item) => (
                <AgendaItem 
                  key={item.id}
                  time={item.time}
                  event={item.event}
                  description={item.description || "Operational phase active."}
                />
              ))
            ) : (
              <>
                <AgendaItem 
                  time="02:00 AM"
                  event="Midnight Surge"
                  description="High-intensity coding session with cloud boost."
                />
                <AgendaItem 
                  time="11:00 AM"
                  event="Soft Freeze"
                  description="Code finalization and staging phase."
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Speakers Section */}
      <section className="px-6 max-w-7xl mx-auto mb-32">
        <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
          <div>
             <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">SESSION <span className="text-white/45">SPEAKERS</span></h2>
             <p className="text-white/45 uppercase tracking-[0.4em] font-black text-xs">The minds behind the machines</p>
          </div>
          <div className="hidden md:block h-[1px] flex-1 bg-white/5 mx-12 mb-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {speakers.length > 0 ? (
            speakers.map((s) => (
              <SpeakerCard 
                key={s.id}
                name={s.name}
                role={s.role}
                company={s.company}
                photo={s.photo}
              />
            ))
          ) : (
            <>
              <SpeakerCard 
                name="Sarah Connor"
                role="Lead AI Architect"
                company="Google Cloud"
                photo="https://plus.unsplash.com/premium_photo-1681412217144-8bd92efbe05a?q=80&w=300&h=300&fit=crop"
              />
              <SpeakerCard 
                name="Elon M."
                role="Mars Protocol Engineer"
                company="SpaceX"
                photo="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&h=300&fit=crop"
              />
              <SpeakerCard 
                name="Jensen Huang"
                role="Visual Compute Lead"
                company="NVIDIA"
                photo="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&h=300&fit=crop"
              />
            </>
          )}
        </div>
      </section>

      {/* Honoured Guests Section */}
      {guests.length > 0 && (
        <section className="px-6 max-w-7xl mx-auto mb-32">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
            <div>
               <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">HONOURED <span className="text-white/45">GUESTS</span></h2>
               <p className="text-white/45 uppercase tracking-[0.4em] font-black text-xs">Distinguished personalities joining us</p>
            </div>
            <div className="hidden md:block h-[1px] flex-1 bg-white/5 mx-12 mb-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {guests.map((g) => (
              <GuestCard 
                key={g.id}
                name={g.name}
                position={g.position}
                photo={g.photo}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sponsors Section */}
      <section className="px-6 max-w-7xl mx-auto">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[60px] p-12 md:p-24 overflow-hidden relative">
          <div className="absolute inset-0 bg-accent-600/5 blur-[100px] pointer-events-none" />
          <div className="text-center mb-20 relative z-10">
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-6">STRATEGIC <span className="text-white/45">PARTNERS</span></h2>
            <div className="h-1 w-24 bg-accent-500 mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10">
            {partners.length > 0 ? (
              partners.map((p) => (
                <SponsorLogo key={p.id} name={p.name} tier={p.tier.replace(" PARTNER", "")} logo={p.logo} />
              ))
            ) : (
              <>
                <SponsorLogo name="Google" tier="Titanium" />
                <SponsorLogo name="AWS" tier="Cloud" />
                <SponsorLogo name="MLH" tier="Community" />
                <SponsorLogo name="Nvidia" tier="Compute" />
                <SponsorLogo name="Intel" tier="Silicon" />
                <SponsorLogo name="GitHub" tier="Source" />
                <SponsorLogo name="Mistral" tier="LLM" />
                <SponsorLogo name="Vercel" tier="Edge" />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
