import { Lightbulb, HeartPulse, Search, Sparkles } from "lucide-react";

export const trackIcons: Record<string, any> = {
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

/** Tracks are stored with full titles, so match the theme on a keyword. */
export const themeFor = (name: string = "") => {
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
