"use client";
import { X, Pin } from "lucide-react";
import { Announcement } from "@/lib/types";

export default function AnnouncementModal({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {announcement.pinned && <Pin size={13} className="text-coral" />}
            <h3 className="font-display text-base text-ink">{announcement.title}</h3>
          </div>
          <button onClick={onClose} className="flex-shrink-0"><X size={18} className="text-muted" /></button>
        </div>
        <p className="text-[11px] text-muted mb-4">{new Date(announcement.created_at).toLocaleDateString("ko-KR")}</p>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{announcement.content}</p>
      </div>
    </div>
  );
}
