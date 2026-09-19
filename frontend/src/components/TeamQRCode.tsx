import { useState } from "react";
import { QrCode, Download, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";

interface TeamQRCodeProps {
  team: {
    id: string;
    name: string;
    checkedIn?: boolean;
    checkedInAt?: any;
    city?: string;
  };
}

export default function TeamQRCode({ team }: TeamQRCodeProps) {
  const [downloading, setDownloading] = useState(false);
  const checkInUrl = `${window.location.origin}/checkin/${team.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Fetch the QR code image and trigger a download
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${team.name.replace(/\s+/g, "_")}_Attendance_QR_Ticket.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("QR Code download block:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-neutral-900 via-zinc-950 to-neutral-900 border border-white/10 rounded-[32px] p-8 max-w-sm w-full relative overflow-hidden group shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] mx-auto font-sans">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 blur-[50px] pointer-events-none group-hover:bg-accent-500/10 transition-all duration-700" />
      
      {/* Header Pattern */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-accent-500 block mb-1">
            Official Entry Ticket
          </span>
          <h4 className="text-xl font-black uppercase tracking-tighter italic text-white leading-tight">
            Hacktoberfest Dehradun 2026
          </h4>
        </div>
        <div className="h-2.5 w-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-around px-1">
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span className="w-1 h-1 bg-white/20 rounded-full" />
        </div>
      </div>

      {/* Ticket Body / QR Canvas */}
      <div className="bg-black/60 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center relative">
        {/* QR Wrapper */}
        <div className="bg-white p-4 rounded-xl relative overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-all duration-500 ease-out">
          <img 
            src={qrCodeUrl} 
            alt="Check-in QR Code Verification Link" 
            referrerPolicy="no-referrer"
            className="w-[180px] h-[180px] block"
          />
        </div>
        
        {/* Verification Tag */}
        <div className="mt-4 text-[11px] font-mono font-bold text-white/40 tracking-widest break-all select-all text-center">
          HASH: {team.id.substring(0, 10).toUpperCase()}...
        </div>
      </div>

      {/* Perforation Line */}
      <div className="my-6 relative flex items-center justify-between">
        <div className="w-4 h-8 bg-black rounded-r-full -ml-10 border-t border-r border-b border-white/10 z-10" />
        <div className="flex-1 border-t-2 border-dashed border-white/10 mx-2" />
        <div className="w-4 h-8 bg-black rounded-l-full -mr-10 border-t border-l border-b border-white/10 z-10" />
      </div>

      {/* Crew Info & Attendance Status */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/30 truncate max-w-[150px]">
              TEAMS / SQUADDIE
            </div>
            <div className="text-lg font-black uppercase tracking-tighter italic text-white leading-none mt-1">
              {team.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-wider text-white/30">
              STATUS
            </div>
            <div className="mt-1">
              {team.checkedIn ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-500/10 border border-green-500/20 text-green-400 uppercase tracking-widest">
                  <CheckCircle className="w-3 h-3 text-green-400" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-accent-500/10 border border-accent-500/20 text-accent-400 uppercase tracking-widest animate-pulse">
                  <Clock className="w-3 h-3 text-accent-400" /> Pending Gate
                </span>
              )}
            </div>
          </div>
        </div>

        {team.checkedInAt && (
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center text-[10px] text-white/40 font-bold uppercase tracking-widest">
            INDUCTION TIME: {new Date(team.checkedInAt?.seconds ? team.checkedInAt.seconds * 1000 : team.checkedInAt).toLocaleString()}
          </div>
        )}

        {/* Buttons / External Link action */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 px-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            {downloading ? "Saving..." : "Save Pass"}
          </button>
          
          <a
            href={checkInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-accent-500 text-black hover:bg-accent-400 rounded-xl transition-all flex items-center justify-center shadow-[0_5px_15px_rgba(34,197,94,0.2)] active:scale-95"
            title="Launch live checkin state"
          >
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>
      </div>
    </div>
  );
}
