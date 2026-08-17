"use client";
import { X } from "lucide-react";

// 사진을 탭하면 원본 해상도 기준으로 화면 가득 크게 보여주는 뷰어.
// 이미지가 화면보다 크면 스크롤해서 볼 수 있고, 작으면 그 크기 그대로 가운데 표시된다.
export default function Lightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center overflow-auto"
      onClick={onClose}
    >
      <button onClick={onClose} className="fixed top-4 right-4 z-[101] w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white">
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt ?? ""}
        className="max-w-none"
        style={{ width: "auto", height: "auto", maxWidth: "100vw" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
