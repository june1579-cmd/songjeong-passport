"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Photo, Program } from "@/lib/types";
import TopBar from "@/components/TopBar";
import Lightbox from "@/components/Lightbox";

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filter, setFilter] = useState<string>("전체");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("photos").select("*").order("created_at", { ascending: false }).then(({ data }) => setPhotos(data ?? []));
    supabase.from("programs").select("*").then(({ data }) => setPrograms(data ?? []));
  }, []);

  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    programs.forEach((p) => (map[p.id] = p));
    return map;
  }, [programs]);

  const programsWithPhotos = useMemo(() => {
    const ids = new Set(photos.map((p) => p.program_id).filter(Boolean) as string[]);
    return programs.filter((p) => ids.has(p.id));
  }, [photos, programs]);

  const filtered = filter === "전체" ? photos : photos.filter((p) => p.program_id === filter);

  return (
    <div className="pb-16 min-h-screen">
      <TopBar title="활동 갤러리" backHref="/" />

      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("전체")}
            className={`flex-shrink-0 text-xs px-3.5 py-2 rounded-full font-medium ${filter === "전체" ? "bg-navy text-white" : "bg-white border border-line text-ink"}`}
          >
            전체
          </button>
          {programsWithPhotos.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className={`flex-shrink-0 text-xs px-3.5 py-2 rounded-full font-medium ${filter === p.id ? "bg-navy text-white" : "bg-white border border-line text-ink"}`}
            >
              {p.emoji} {p.title}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-2 grid grid-cols-2 gap-2.5">
        {filtered.map((ph) => {
          const prog = ph.program_id ? programMap[ph.program_id] : null;
          return (
            <button key={ph.id} onClick={() => setLightboxSrc(ph.image_url)} className="rounded-xl overflow-hidden border border-line bg-white text-left">
              <img src={ph.image_url} alt={ph.caption ?? ""} className="w-full h-32 object-cover" />
              <div className="p-2">
                {prog && <p className="text-[10px] text-muted">{prog.emoji} {prog.title}</p>}
                {ph.caption && <p className="text-xs text-ink mt-0.5 line-clamp-2">{ph.caption}</p>}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-muted col-span-2 text-center mt-8">사진이 없어요.</p>}
      </div>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
