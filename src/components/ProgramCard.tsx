import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Program } from "@/lib/types";
import { CardStatus, remainingSpots } from "@/lib/program-status";
import { categoryColor } from "@/lib/category-colors";
import StatusBadge from "./StatusBadge";
import CategoryPill from "./CategoryPill";

export default function ProgramCard({
  program,
  dateLabel,
  status,
  totalCapacity,
  totalRegistrations,
}: {
  program: Program;
  dateLabel: string;
  status: CardStatus;
  totalCapacity: number | null;
  totalRegistrations: number;
}) {
  const remaining = remainingSpots(totalCapacity, totalRegistrations);
  const dimmed = status === "full" || status === "closed" || status === "cancelled";
  const c = categoryColor(program.category);

  return (
    <Link
      href={`/programs/${program.id}`}
      className={`w-full text-left rounded-2xl overflow-hidden block bg-white border border-line ${dimmed ? "opacity-70" : ""}`}
    >
      <div className="p-4 flex gap-3">
        <div className="rounded-xl flex items-center justify-center flex-shrink-0 w-14 h-14 text-2xl" style={{ background: c.bg }}>
          {program.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base text-ink leading-snug">{program.title}</h3>
          </div>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted">
            <Calendar size={12} /> <span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted">
            <MapPin size={12} /> <span className="truncate">{program.location}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            <CategoryPill category={program.category} />
            <StatusBadge status={status} remaining={remaining} />
            <span className="text-xs text-muted">{program.fee}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
