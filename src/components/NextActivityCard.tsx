import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Program, Session } from "@/lib/types";

export default function NextActivityCard({
  program,
  session,
  mode,
}: {
  program: Program;
  session: Session | null;
  mode: "myUpcoming" | "recommend";
}) {
  return (
    <Link
      href={`/programs/${program.id}`}
      className="block rounded-2xl p-5 text-white relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0D3B4E 0%, #155067 60%, #3F9179 130%)" }}
    >
      <p className="text-[11px] font-medium text-white/70 mb-2 tracking-wide">
        {mode === "myUpcoming" ? "다음 일정" : "이번 주 추천"}
      </p>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-2xl flex-shrink-0">
          {program.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base leading-snug mb-1.5">{program.title}</h3>
          {session && (
            <div className="flex items-center gap-1 text-xs text-white/80 mb-0.5">
              <Calendar size={12} /> {session.session_date} · {session.start_time?.slice(0, 5)}~{session.end_time?.slice(0, 5)}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-white/80">
            <MapPin size={12} /> {program.location}
          </div>
        </div>
        <ArrowRight size={18} className="text-white/70 flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}
