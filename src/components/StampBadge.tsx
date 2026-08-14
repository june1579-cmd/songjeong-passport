import { Stamp } from "lucide-react";

export default function StampBadge({ n, filled }: { n: number; filled: boolean }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-display text-sm w-10 h-10 border-2 border-dashed ${
        filled ? "border-coral text-coral bg-sandLight" : "border-line text-line"
      }`}
    >
      {filled ? <Stamp size={18} /> : n}
    </div>
  );
}
