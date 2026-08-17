"use client";
import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Photo, Program } from "@/lib/types";

export default function AdminPhotosPage() {
  const [list, setList] = useState<Photo[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    supabase.from("photos").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
    supabase.from("programs").select("*").then(({ data }) => setPrograms(data ?? []));
  };
  useEffect(load, []);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
    if (upErr) {
      setError(`업로드 실패: ${upErr.message}`);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    const { error: insertErr } = await supabase.from("photos").insert({ program_id: programId || null, image_url: pub.publicUrl, caption });
    if (insertErr) {
      setError(`사진 정보 저장 실패: ${insertErr.message}`);
      setUploading(false);
      return;
    }
    setCaption("");
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
        <input ref={fileRef} type="file" accept="image/*" className="w-full text-xs" />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="사진 설명" className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
        <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm">
          <option value="">전체 갤러리 (프로그램 무관)</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
        </select>
        {error && <p className="text-xs text-coralDark">{error}</p>}
        <button disabled={uploading} onClick={upload} className="w-full flex items-center justify-center gap-1 py-2.5 rounded-lg bg-coral text-white text-sm font-display disabled:opacity-40">
          <Upload size={14} /> {uploading ? "업로드 중..." : "사진 업로드"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {list.map((ph) => {
          const prog = programs.find((p) => p.id === ph.program_id);
          return (
            <div key={ph.id} className="rounded-xl overflow-hidden border border-line bg-white">
              <img src={ph.image_url} alt={ph.caption ?? ""} className="w-full h-28 object-cover" />
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
