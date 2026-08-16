"use client";
import { useEffect, useState } from "react";
import { Search, Archive, ArchiveRestore, Trash2, Save, AlertTriangle } from "lucide-react";
import { Participant, AGE_OPTIONS, RESIDENCE_OPTIONS } from "@/lib/types";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "요청 실패");
  return res.json();
}

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; age_group: string; residence_area: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const { participants: data } = await api("/api/admin/participants");
      setParticipants(data ?? []);
    } catch (e: any) {
      setError(e.message ?? "불러오기에 실패했습니다.");
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = participants.filter((p) => {
    if (p.is_archived !== showArchived) return false;
    if (!query.trim()) return true;
    return p.name.includes(query) || p.phone4.includes(query) || (p.phone_number ?? "").includes(query);
  });

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((p) => p.id)));
  };

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditDraft({ name: p.name, age_group: p.age_group, residence_area: p.residence_area });
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    await api("/api/admin/participants", { method: "PATCH", body: JSON.stringify({ id, patch: editDraft }) });
    setEditingId(null);
    setEditDraft(null);
    load();
  };

  const toggleArchive = async (p: Participant) => {
    await api("/api/admin/participants", { method: "PATCH", body: JSON.stringify({ id: p.id, patch: { is_archived: !p.is_archived } }) });
    load();
  };

  const remove = async (p: Participant) => {
    if (!window.confirm(`"${p.name}" 참여자를 완전히 삭제할까요? 신청/출석/설문 등 관련 기록이 모두 함께 삭제되며 되돌릴 수 없습니다.`)) return;
    await api("/api/admin/participants", { method: "DELETE", body: JSON.stringify({ ids: [p.id] }) });
    load();
  };

  const bulkDelete = async () => {
    if (confirmText !== "삭제") return;
    await api("/api/admin/participants", { method: "DELETE", body: JSON.stringify({ ids: [...selectedIds] }) });
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setConfirmText("");
    load();
  };

  return (
    <div className="p-4 pb-16">
      <h1 className="font-display text-lg text-navy mb-1">참여자 명단 관리</h1>
      <p className="text-xs text-muted mb-4">이름/전화번호로 검색, 정보 수정, 보관(비활성화), 개별·일괄 삭제가 가능합니다.</p>
      {error && <p className="text-xs text-coralDark mb-2">{error}</p>}

      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 border border-line rounded-lg px-3 py-2 bg-white">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 또는 전화번호"
            className="flex-1 text-sm outline-none"
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1 flex-shrink-0 ${showArchived ? "bg-navy text-white" : "border border-line text-navy"}`}
        >
          <Archive size={13} /> 보관함
        </button>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filtered.length} onChange={toggleAll} />
          전체 선택 ({selectedIds.size}명 선택됨)
        </label>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!selectedIds.size}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-coralDark text-white disabled:opacity-30"
        >
          <Trash2 size={12} /> 선택 일괄 삭제
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
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink mb-1">{p.name}</p>
                  <div className="grid grid-cols-[52px_1fr] gap-x-2 gap-y-0.5 text-[11px] text-muted max-w-xs">
                    <span className="text-muted/70">전화번호</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{p.phone_number ?? `****-****-${p.phone4}`}</span>
                    <span className="text-muted/70">연령대</span>
                    <span>{p.age_group}</span>
                    <span className="text-muted/70">거주지역</span>
                    <span>{p.residence_area}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 self-start">
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

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2 text-coralDark">
              <AlertTriangle size={18} />
              <h3 className="font-display text-base">정말 삭제할까요?</h3>
            </div>
            <p className="text-xs text-muted mb-4">
              선택한 {selectedIds.size}명의 참여자와 신청/출석/설문 등 관련 기록이 모두 삭제되며 되돌릴 수 없습니다. 계속하려면 아래에 <b>삭제</b>를 입력하세요.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="삭제"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => { setConfirmOpen(false); setConfirmText(""); }} className="flex-1 py-2.5 rounded-lg border border-line text-sm text-muted">취소</button>
              <button
                onClick={bulkDelete}
                disabled={confirmText !== "삭제"}
                className="flex-1 py-2.5 rounded-lg bg-coralDark text-white text-sm font-medium disabled:opacity-30"
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
