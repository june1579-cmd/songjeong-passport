import { Stamp } from "lucide-react";
import { STAMP_PALETTE } from "@/lib/category-colors";

export default function StampBadge({ n, filled }: { n: number; filled: boolean }) {
  const color = STAMP_PALETTE[(n - 1) % STAMP_PALETTE.length];
  return (
    <div
      className="rounded-full flex items-center justify-center font-display text-sm w-10 h-10 border-2 border-dashed"
      style={filled ? { borderColor: color, color, background: `${color}18` } : { borderColor: "#E3DCC9", color: "#E3DCC9" }}
    >
      {filled ? <Stamp size={18} /> : n}
    </div>
  );
}
