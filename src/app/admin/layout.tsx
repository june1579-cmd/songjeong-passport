"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/programs", label: "프로그램 관리" },
  { href: "/admin/participants", label: "참여자 관리" },
  { href: "/admin/announcements", label: "공지사항" },
  { href: "/admin/photos", label: "사진 갤러리" },
  { href: "/admin/reviews", label: "후기 관리" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // 로그인 화면은 별도 전체화면 디자인이라 관리자 네비게이션을 씌우지 않는다.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="flex items-center justify-between px-3 pt-3 pb-1 bg-white border-b border-line sticky top-0 z-20 gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full font-medium ${
                pathname === n.href ? "bg-navy text-white" : "bg-sand text-navy"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
          <LogOut size={13} /> 로그아웃
        </button>
      </div>
      {children}
    </div>
  );
}
