import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/** Small mono eyebrow used to open every section. */
export const Eyebrow = ({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "info" }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className={cn("w-1.5 h-1.5 rounded-full", tone === "accent" ? "bg-accent-400" : "bg-info-400")} />
    <span className={cn("font-mono text-[12px] tracking-[0.25em] uppercase", tone === "accent" ? "text-accent-400" : "text-info-400")}>
      {children}
    </span>
  </div>
);

export const SectionHead = ({ eyebrow, title, sub, tone }: { eyebrow: string; title: ReactNode; sub?: string; tone?: "accent" | "info" }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
    <div className="max-w-2xl">
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2 className="font-display text-4xl md:text-5xl font-bold leading-[1.05]">{title}</h2>
    </div>
    {sub && <p className="max-w-sm text-white/50 text-[16px] leading-relaxed">{sub}</p>}
  </div>
);
