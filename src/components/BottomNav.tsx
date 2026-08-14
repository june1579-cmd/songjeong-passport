"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Stamp } from "lucide-react";

// 주민용 하단 네비게이션 — 관리자 메뉴는 여기 섞지 않는다(관리자는 /admin/login으로 별도 접근).
const items = [
  { href: "/", label: "홈", icon: Home },
  { href: "/passport", label: "패스포트", icon: Stamp },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-white border-line max-w-[480px] mx-auto">
      {items.map((it) => {
        const active = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${active ? "text-coral" : "text-muted"}`}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span className="text-[11px] font-body">{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
