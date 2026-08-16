"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Program, Session, ProgramStatus, PROGRAM_STATUS_LABEL } from "@/lib/types";
import { ProgramBasicFields, ProgramFormState, SessionEditor, SessionDraft } from "@/components/ProgramFields";

export default function EditProgramPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<ProgramFormState | null>(null);
  const [programStatus, setProgramStatus] = useState<ProgramStatus>("draft");
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [existingSessionIds, setExistingSessionIds] = useState<Record<string, string>>({});
  const [removedSessionIds, setRemovedSessionIds] = useState<string[]>([]);
  const [otherPrograms, setOtherPrograms] = useState<Program[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("programs").select("*").eq("id", id).single();
      if (p) {
        setForm({
          id: p.id, emoji: p.emoji ?? "", title: p.title, description: p.description ?? "",
          location: p.location ?? "", address: p.address ?? "", fee: p.fee ?? "", target: p.target ?? "",
          requirement: p.requirement ?? "", prep: p.prep ?? "", instructor: p.instructor ?? "",
          instructorBio: p.instructor_bio ?? "", instructorPhotoUrl: p.instructor_photo_url ?? "",
          capacity: p.capacity, nextProgramId: p.next_program_id ?? "", nextTeaser: p.next_teaser ?? "",
          category: p.category ?? "",
          sessionSelectionMode: p.session_selection_mode ?? "select",
          maxSelectableSessions: p.max_selectable_sessions ?? null,
        });
        setProgramStatus(p.program_status ?? "draft");
      }
      const { data: all } = await supabase.from("programs").select("*");
      setOtherPrograms((all ?? []).filter((x) => x.id !== id));

      const { data: sess } = await supabase.from("sessions").select("*").eq("program_id", id).order("session_date");
      const drafts: SessionDraft[] = [];
      const idMap: Record<string, string> = {};
      (sess ?? []).forEach((s: Session) => {
        const key = `existing-${s.id}`;
        drafts.push({ key, session_label: s.session_label, session_date: s.session_date, capacity: s.capacity });
        idMap[key] = s.id;
      });
      setSessions(drafts);
      setExistingSessionIds(idMap);
    })();
  }, [id]);

  if (!form) return null;

  const wrappedSetSessions = (next: SessionDraft[]) => {
    const removedKeys = sessions.filter((s) => !next.some((n) => n.key === s.key)).map((s) => existingSessionIds[s.key]).filter(Boolean);
    if (removedKeys.length) setRemovedSessionIds((prev) => [...prev, ...removedKeys]);
    setSessions(next);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const { error: updErr } = await supabase.from("programs").update({
      emoji: form.emoji, title: form.title, description: form.description, location: form.location,
      address: form.address, fee: form.fee, target: form.target, requirement: form.requirement,
      prep: form.prep, instructor: form.instructor, capacity: form.capacity, category: form.category,
      instructor_bio: form.instructorBio || null, instructor_photo_url: form.instructorPhotoUrl || null,
      session_selection_mode: form.sessionSelectionMode,
      max_selectable_sessions: form.sessionSelectionMode === "select" ? form.maxSelectableSessions : null,
      program_status: programStatus,
      is_published: ["recruiting", "scheduled", "in_progress", "closed"].includes(programStatus),
      next_program_id: form.nextProgramId || null, next_teaser: form.nextTeaser || null,
    }).eq("id", id);
    if (updErr) { setError("저장 중 문제가 발생했습니다."); setSaving(false); return; }

    if (removedSessionIds.length) await supabase.from("sessions").delete().in("id", removedSessionIds);

    const newOnes = sessions.filter((s) => s.key.startsWith("new-") && s.session_date);
    if (newOnes.length) {
      await supabase.from("sessions").insert(newOnes.map((s) => ({ program_id: id, session_label: s.session_label, session_date: s.session_date, capacity: s.capacity })));
    }
    const existingOnes = sessions.filter((s) => s.key.startsWith("existing-"));
    for (const s of existingOnes) {
      await supabase.from("sessions").update({ session_label: s.session_label, session_date: s.session_date, capacity: s.capacity }).eq("id", existingSessionIds[s.key]);
    }

    setSaving(false);
    router.push("/admin/programs");
  };

  const deleteProgram = async () => {
    if (!window.confirm(`"${form.title}" 프로그램을 삭제할까요? 관련 신청/출석 기록도 함께 삭제됩니다.`)) return;
    await supabase.from("programs").delete().eq("id", id);
    router.push("/admin/programs");
  };

  return (
    <div className="p-4 space-y-5 pb-10">
      <h1 className="font-display text-lg text-navy">프로그램 편집</h1>

      <div>
        <label className="text-xs font-medium block mb-1.5 text-muted">프로그램 상태</label>
        <select value={programStatus} onChange={(e) => setProgramStatus(e.target.value as ProgramStatus)} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm">
          {(Object.keys(PROGRAM_STATUS_LABEL) as ProgramStatus[]).map((s) => (
            <option key={s} value={s}>{PROGRAM_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <a href={`/admin/programs/${id}/applications`} className="block text-xs font-medium text-navy underline">
        → 이 프로그램 신청자 관리로 이동
      </a>

      <ProgramBasicFields form={form} setForm={setForm} lockId otherPrograms={otherPrograms} />

      <div>
        <p className="text-xs font-medium mb-1.5 text-muted">회차 일정 (회차마다 정원을 다르게 정하거나, 제한 없음으로 둘 수 있어요)</p>
        <SessionEditor sessions={sessions} setSessions={wrappedSetSessions} defaultCapacity={form.capacity} />
      </div>

      {error && <p className="text-xs text-coralDark">{error}</p>}

      <button disabled={saving} onClick={save} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40">
        {saving ? "저장 중..." : "저장하기"}
      </button>
      <button onClick={deleteProgram} className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-coralDark">
        <Trash2 size={13} /> 프로그램 삭제
      </button>
    </div>
  );
}
