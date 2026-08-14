"use client";
import { useEffect, useState } from "react";
import { Search, Archive, ArchiveRestore, Trash2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Participant, AGE_OPTIONS, RESIDENCE_OPTIONS } from "@/lib/types";

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; age_group: string; residence_area: string } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("participants").select("*").order("created_at", { ascending: false });
    setParticipants(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = participants.filter((p) => {
    if (p.is_archived !== showArchived) return false;
    if (!query.trim()) return true;
    return p.name.includes(query) || p.phone4.includes(query);
  });

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditDraft({ name: p.name, age_group: p.age_group, residence_area: p.residence_area });
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    await supabase.from("participants").update(editDraft).eq("id", id);
    setEditingId(null);
    setEditDraft(null);
    load();
  };

  const toggleArchive = async (p: Participant) => {
    await supabase.from("participants").update({ is_archived: !p.is_archived }).eq("id", p.id);
    load();
  };

  const remove = async (p: Participant) => {
    if (!window.confirm(`"${p.name}" 참여자를 완전히 삭제할까요? 신청/출석/설문 등 관련 기록이 모두 함께 삭제되며 되돌릴 수 없습니다.`)) return;
    await supabase.from("participants").delete().eq("id", p.id);
    load();
  };

  return (
    <div className="p-4 pb-16">
      <h1 className="font-display text-lg text-navy mb-1">참여자 명단 관리</h1>
      <p className="text-xs text-muted mb-4">이름/전화번호로 검색, 정보 수정, 보관(비활성화), 완전 삭제가 가능합니다.</p>

      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 border border-line rounded-lg px-3 py-2 bg-white">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 또는 전화번호 뒤 4자리"
            className="flex-1 text-sm outline-none"
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1 ${showArchived ? "bg-navy text-white" : "border border-line text-navy"}`}
        >
          <Archive size={13} /> 보관함
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-white p-3">
            {editingId === p.id && editDraft ? (
              <div className="space-y-2">
                <input
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  className="w-full border border-line rounded-lg px-2.5 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <select value={editDraft.age_group} onChange={(e) => setEditDraft({ ...editDraft, age_group: e.target.value })} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-xs">
                    {AGE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={editDraft.residence_area} onChange={(e) => setEditDraft({ ...editDraft, residence_area: e.target.value })} className="flex-1 border border-line rounded-lg px-2 py-1.5 text-xs">
                    {RESIDENCE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(p.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-coral text-white text-xs font-medium">
                    <Save size={13} /> 저장
                  </button>
                  <button onClick={() => { setEditingId(null); setEditDraft(null); }} className="flex-1 py-1.5 rounded-lg border border-line text-xs text-muted">
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{p.name} <span className="text-muted font-normal">· {p.phone4}</span></p>
                  <p className="text-[11px] text-muted mt-0.5">{p.age_group} · {p.residence_area}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => startEdit(p)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-line text-navy">수정</button>
                  <button onClick={() => toggleArchive(p)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-line text-navy flex items-center gap-1">
                    {p.is_archived ? <><ArchiveRestore size={12} /> 복원</> : <><Archive size={12} /> 보관</>}
                  </button>
                  <button onClick={() => remove(p)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-line text-coralDark">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted px-1">{showArchived ? "보관된 참여자가 없습니다." : "참여자가 없습니다."}</p>}
      </div>
    </div>
  );
}
