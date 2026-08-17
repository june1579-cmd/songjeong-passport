import Link from "next/link";
import { Stamp, ArrowRight } from "lucide-react";

export default function PassportSummaryCard({
  identified,
  name,
  visitsThisMonth,
  stampCount,
}: {
  identified: boolean;
  name?: string;
  visitsThisMonth?: number;
  stampCount?: number;
}) {
  if (!identified) {
    return (
      <Link href="/signup" className="block rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center flex-shrink-0">
            <Stamp size={18} className="text-navy" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">PassUp 회원가입</p>
            <p className="text-xs text-muted mt-0.5">가입하면 프로그램에 참여하면서 나만의 평생학습 기록이 만들어져요.</p>
          </div>
          <ArrowRight size={16} className="text-muted flex-shrink-0" />
        </div>
      </Link>
    );
  }

  return (
    <Link href="/passport" className="block rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">{name}님의 패스포트</p>
          <p className="text-xs text-muted mt-0.5">이번 달 {visitsThisMonth}회 참여 · 스탬프 {stampCount}개</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-navy flex-shrink-0">
          내 기록 보기 <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  );
}
