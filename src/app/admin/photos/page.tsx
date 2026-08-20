"use client";
import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Photo, Program } from "@/lib/types";
import { isVideoUrl } from "@/lib/media";

export default function AdminPhotosPage() {
  const [list, setList] = useState<Photo[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    supabase.from("photos").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
    supabase.from("programs").select("*").then(({ data }) => setPrograms(data ?? []));
  };
  useEffect(load, []);

  const upload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setError("");
    setProgress({ done: 0, total: selectedFiles.length });

    let failCount = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const path = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) {
        failCount++;
      } else {
        const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
        // 사진이 여러 장이면 같은 설명을 그대로 붙이되, 몇 번째 사진인지 구분되게 표시
        const thisCaption = selectedFiles.length > 1 && caption ? `${caption} (${i + 1}/${selectedFiles.length})` : caption;
        const { error: insertErr } = await supabase.from("photos").insert({ program_id: programId || null, image_url: pub.publicUrl, caption: thisCaption });
        if (insertErr) failCount++;
      }
      setProgress({ done: i + 1, total: selectedFiles.length });
    }

    if (failCount > 0) setError(`${failCount}장은 업로드에 실패했어요. 나머지는 정상 업로드됐습니다.`);
    setCaption("");
    setSelectedFiles([]);
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("photos").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-4 space-y-5 pb-10">
      <h1 className="font-display text-lg text-navy">사진 갤러리 관리</h1>

      <div className="rounded-xl border border-line bg-white p-3 space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
          className="w-full text-xs"
        />
        {selectedFiles.length > 0 && (
          <p className="text-[11px] text-navy">{selectedFiles.length}개 선택됨 (사진·영상 함께 가능)</p>
        )}
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="사진 설명 (여러 장이면 공통 설명으로 쓰여요)" className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
        <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm">
          <option value="">전체 갤러리 (프로그램 무관)</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
        </select>
        {error && <p className="text-xs text-coralDark">{error}</p>}
        <button disabled={uploading || !selectedFiles.length} onClick={upload} className="w-full flex items-center justify-center gap-1 py-2.5 rounded-lg bg-coral text-white text-sm font-display disabled:opacity-40">
          <Upload size={14} />
          {uploading
            ? `업로드 중... (${progress.done}/${progress.total})`
            : selectedFiles.length > 1
              ? `${selectedFiles.length}개 업로드`
              : "사진·영상 업로드"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {list.map((ph) => {
          const prog = programs.find((p) => p.id === ph.program_id);
          return (
            <div key={ph.id} className="rounded-xl overflow-hidden border border-line bg-white">
              {isVideoUrl(ph.image_url) ? (
                <video src={ph.image_url} className="w-full h-28 object-cover bg-black" controls muted playsInline />
              ) : (
                <img src={ph.image_url} alt={ph.caption ?? ""} className="w-full h-28 object-cover" />
              )}
              <div className="p-2">
                <p className="text-xs text-ink truncate">{ph.caption}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted">{prog ? prog.emoji : "전체"}</span>
                  <button onClick={() => remove(ph.id)} className="text-coralDark"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-xs text-muted col-span-2">등록된 사진이 없습니다.</p>}
      </div>
    </div>
  );
}
