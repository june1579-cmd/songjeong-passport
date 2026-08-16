// "Experience Passport" 브랜드 마크 — 여권/스탬프를 은유한 심볼.
export default function PassportMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="5" y="4" width="22" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="16" cy="14" r="4.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M11 24 Q16 21 21 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
