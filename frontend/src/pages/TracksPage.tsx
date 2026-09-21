import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { SectionHead } from "../components/SectionHead";
import { themeFor } from "../lib/tracks-theme";

export default function TracksPage() {
  const reduceMotion = useReducedMotion();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("tracks").select("*").then(({ data }) => {
      setTracks(data ?? []);
      setLoading(false);
    });
  }, []);

  const rise: any = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" } };

  return (
    <div className="pt-28 pb-24">
      <section className="px-5 sm:px-6 py-8 md:py-10 max-w-6xl mx-auto">
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
                        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/30">Problem statements</p>
                        {theme.problems.map((problem: string, k: number) => (
                          <div key={k} className="flex items-start gap-2.5">
                            <span className={cn("w-1 h-1 rounded-full mt-2 shrink-0", theme.color.replace('text-', 'bg-'))} />
                            <span className="text-[14px] text-white/65 leading-snug">{problem}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/30">
                      <Lock className="w-3 h-3" aria-hidden="true" /> Locked until kickoff
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
