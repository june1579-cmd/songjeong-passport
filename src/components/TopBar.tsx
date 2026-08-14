"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function TopBar({ title, backHref, right }: { title: string; backHref?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-20 bg-navy">
      <div className="flex items-center gap-2">
        {backHref && (
          <button onClick={() => router.push(backHref)} className="text-white/90 p-1 -ml-1">
            <ChevronLeft size={22} />
          </button>
        )}
        <span className="font-display text-white text-lg tracking-wide">{title}</span>
      </div>
      {right}
    </div>
  );
}
