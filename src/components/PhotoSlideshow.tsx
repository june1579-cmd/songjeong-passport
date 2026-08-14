"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Photo, Program } from "@/lib/types";

export default function PhotoSlideshow({ photos, programMap }: { photos: Photo[]; programMap: Record<string, Program> }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), 4000);
    return () => clearInterval(timer);
  }, [photos.length]);

  if (photos.length === 0) return null;
  const current = photos[index];
  const program = programMap[current.program_id ?? ""];

  const Card = (
    <div className="relative rounded-2xl overflow-hidden h-44 border border-line">
      <img src={current.image_url} alt={current.caption ?? ""} className="w-full h-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        {program && <p className="text-white text-xs font-medium">{program.emoji} {program.title}</p>}
        {current.caption && <p className="text-white/80 text-[11px] mt-0.5">{current.caption}</p>}
      </div>
      <div className="absolute top-2.5 right-2.5 flex gap-1">
        {photos.map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`} />
        ))}
      </div>
    </div>
  );

  return program ? <Link href={`/programs/${program.id}`}>{Card}</Link> : <div>{Card}</div>;
}
