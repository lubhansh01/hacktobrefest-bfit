import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { subscribe } from "../lib/supabase";
import { SectionHead } from "../components/SectionHead";

const defaultRounds = [
  { r: 1, title: "Ideation Sprint", desc: "Teams brainstorm and pitch initial ideas in 2-3 minutes based on problem themes." },
  { r: 2, title: "Research & Feasibility", desc: "Validating market need, existing solutions, and feasibility of the chosen idea." },
  { r: 3, title: "System Design Round", desc: "Architecture planning: tech stack selection, API design, and flow diagram creation." },
  { r: 4, title: "Development Sprint", desc: "The main 24-hour hackathon phase. Building the MVP / working prototype." },
  { r: 5, title: "Surprise Challenge", desc: "Adding twists or debugging tests to check teams' adaptability and real-world thinking." },
  { r: 6, title: "Final Demo & Pitch", desc: "Teams present their solution, demo, and future scope in 5-8 minutes." }
];

export default function SchedulePage() {
  const reduceMotion = useReducedMotion();
  const [rounds, setRounds] = useState<any[]>([]);

  useEffect(() => {
    return subscribe("rounds", setRounds, { orderBy: { column: "order" } });
  }, []);

  const rise: any = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" } };

  return (
    <div className="pt-28 pb-24">
      <section className="px-5 sm:px-6 py-8 md:py-10 max-w-6xl mx-auto">
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
                  <span className="font-mono nums text-[12px] tracking-[0.2em] text-accent-500/70">
                    {String(order).padStart(2, '0')}
                  </span>
                  {round.isActive && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/12 border border-accent-500/25 px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" aria-hidden="true" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent-300">Live</span>
                    </span>
                  )}
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{name}</h3>
                <p className="text-white/45 text-[14px] leading-relaxed">{desc}</p>
              </motion.li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
