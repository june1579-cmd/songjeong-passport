"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Program } from "@/lib/types";
import { ProgramBasicFields, ProgramFormState, SessionEditor, SessionDraft } from "@/components/ProgramFields";

const empty: ProgramFormState = {
  id: "", emoji: "🌊", title: "", description: "", location: "", address: "",
  fee: "무료", target: "", requirement: "", prep: "", instructor: "",
  instructorBio: "", instructorPhotoUrl: "",
  capacity: null, category: "지역활동", nextProgramId: "", nextTeaser: "",
  sessionSelectionMode: "select", maxSelectableSessions: null,
};

export default function NewProgramPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProgramFormState>(empty);
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [otherPrograms, setOtherPrograms] = useState<Program[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("programs").select("*").then(({ data }) => setOtherPrograms(data ?? []));
  }, []);

  const canSubmit = form.id.trim() && form.title.trim();

  const submit = async (publish: boolean) => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    const { error: insertErr } = await supabase.from("programs").insert({
      id: form.id.trim(),
      emoji: form.emoji,
      title: form.title,
      description: form.description,
      location: form.location,
      address: form.address,
      fee: form.fee,
      target: form.target,
      requirement: form.requirement,
      prep: form.prep,
      instructor: form.instructor,
      instructor_bio: form.instructorBio || null,
      instructor_photo_url: form.instructorPhotoUrl || null,
      capacity: form.capacity,
      category: form.category,
      session_selection_mode: form.sessionSelectionMode,
      max_selectable_sessions: form.sessionSelectionMode === "select" ? form.maxSelectableSessions : null,
      program_status: publish ? "recruiting" : "draft",
      next_program_id: form.nextProgramId || null,
      next_teaser: form.nextTeaser || null,
      is_published: publish,
    });
    if (insertErr) {
      setError(insertErr.message.includes("duplicate") ? "이미 사용 중인 프로그램 ID입니다." : "저장 중 문제가 발생했습니다.");
      setSaving(false);
      return;
    }

    const validSessions = sessions.filter((s) => s.session_date);
    if (validSessions.length) {
      await supabase.from("sessions").insert(
        validSessions.map((s) => ({ program_id: form.id.trim(), session_label: s.session_label, session_date: s.session_date, capacity: s.capacity }))
      );
    }
    setSaving(false);
    router.push("/admin/programs");
  };

  return (
    <div className="p-4 space-y-5 pb-10">
      <h1 className="font-display text-lg text-navy">새 프로그램 만들기</h1>
      <ProgramBasicFields form={form} setForm={setForm} otherPrograms={otherPrograms} />

      <div>
        <p className="text-xs font-medium mb-1.5 text-muted">회차 일정 (회차마다 정원을 다르게 정하거나, 제한 없음으로 둘 수 있어요)</p>
        <SessionEditor sessions={sessions} setSessions={setSessions} defaultCapacity={form.capacity} />
      </div>

      {error && <p className="text-xs text-coralDark">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button disabled={!canSubmit || saving} onClick={() => submit(false)} className="flex-1 py-3 rounded-xl font-display text-sm border border-navy text-navy disabled:opacity-40">
          초안 저장
        </button>
        <button disabled={!canSubmit || saving} onClick={() => submit(true)} className="flex-1 py-3 rounded-xl font-display text-sm bg-coral text-white disabled:opacity-40">
          {saving ? "저장 중..." : "저장 후 게시"}
        </button>
      </div>
    </div>
  );
}
