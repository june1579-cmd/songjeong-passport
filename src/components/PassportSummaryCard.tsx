"use client";
import Link from "next/link";
import { Stamp, ArrowRight, LogOut } from "lucide-react";
import { clearStoredParticipantId } from "@/lib/participant-session";

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
  const logout = () => {
    if (window.confirm("로그아웃 하시겠어요? 다시 로그인하려면 이름과 휴대폰 번호 뒤 4자리가 필요해요.")) {
      clearStoredParticipantId();
      window.location.href = "/";
    }
  };

  if (!identified) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <Link href="/signup" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center flex-shrink-0">
            <Stamp size={18} className="text-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink leading-snug">PassUp 회원가입</p>
            <p className="text-xs text-muted leading-relaxed mt-0.5">가입하면 프로그램에 참여하면서 나만의 평생학습 기록이 만들어져요.</p>
          </div>
          <ArrowRight size={16} className="text-muted flex-shrink-0" />
        </Link>
        <Link href="/passport" className="block text-center text-xs font-medium text-coral mt-3 pt-3 border-t border-line">
          이미 가입하셨나요? 로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <Link href="/passport" className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug truncate">{name}님의 패스포트</p>
          <p className="text-xs text-muted leading-relaxed mt-0.5">이번 달 {visitsThisMonth}회 참여 · 스탬프 {stampCount}개</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-navy flex-shrink-0">
          내 기록 보기 <ArrowRight size={14} />
        </div>
      </Link>
      <div className="flex items-center justify-end mt-3 pt-3 border-t border-line">
        <button onClick={logout} className="flex items-center gap-1 text-xs font-medium text-muted">
          <LogOut size={12} /> 로그아웃
        </button>
      </div>
    </div>
  );
}
