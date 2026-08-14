export default function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-coral bg-[#FBE4D8]" : "border-line bg-white"}`}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`font-display text-xl mt-0.5 ${highlight ? "text-coralDark" : "text-ink"}`}>{value}</div>
    </div>
  );
}
