"use client";
import { useEffect, useState } from "react";
import { Trash2, Pin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Announcement, Program } from "@/lib/types";

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [programId, setProgramId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
    supabase.from("programs").select("*").then(({ data }) => setPrograms(data ?? []));
  };
  useEffect(load, []);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await supabase.from("announcements").insert({ title, content, program_id: programId || null, pinned });
    setTitle(""); setContent(""); setProgramId(""); setPinned(false);
    setSaving(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-4 space-y-5 pb-10">
      <h1 className="font-display text-lg text-navy">공지사항 관리</h1>

      <div className="rounded-xl border border-line bg-white p-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" rows={3} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
        <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm">
          <option value="">전체 공지 (프로그램 무관)</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> 상단 고정
        </label>
        <button disabled={saving} onClick={submit} className="w-full py-2.5 rounded-lg bg-coral text-white text-sm font-display disabled:opacity-40">
          {saving ? "등록 중..." : "공지 등록"}
        </button>
      </div>

      <div className="space-y-2">
        {list.map((a) => {
          const prog = programs.find((p) => p.id === a.program_id);
          return (
            <div key={a.id} className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {a.pinned && <Pin size={12} className="text-coral" />}
                  <span className="text-sm font-medium text-ink">{a.title}</span>
                </div>
                <button onClick={() => remove(a.id)} className="text-coralDark"><Trash2 size={14} /></button>
              </div>
              <p className="text-xs text-muted mt-1">{a.content}</p>
              <p className="text-[10px] text-muted mt-1">{prog ? `${prog.emoji} ${prog.title}` : "전체 공지"}</p>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-xs text-muted">등록된 공지가 없습니다.</p>}
      </div>
    </div>
  );
}
