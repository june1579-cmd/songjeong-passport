"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { CHANNEL_OPTIONS, Program, Participant, Session } from "@/lib/types";
import TopBar from "@/components/TopBar";
import ChipSelect from "@/components/ChipSelect";

function JoinPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const programId = params.get("programId")!;
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [me, setMe] = useState<Participant | null | undefined>(undefined);
  const [channel, setChannel] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("programs").select("*").eq("id", programId).single().then(({ data }) => setProgram(data));
    supabase.from("sessions").select("*").eq("program_id", programId).order("session_date").then(({ data }) => setSessions(data ?? []));
    // 회차별 신청(선택) 인원 — registration_sessions 기준
    supabase.from("registration_sessions").select("session_id").eq("program_id", programId).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: { session_id: string }) => { counts[r.session_id] = (counts[r.session_id] ?? 0) + 1; });
      setSessionCounts(counts);
    });

    const pid = getStoredParticipantId();
    if (!pid) {
      router.replace(`/signup?next=${encodeURIComponent(`/join?programId=${programId}`)}`);
      return;
    }
    supabase.rpc("rpc_get_my_participant", { p_id: pid }).maybeSingle().then(({ data }) => setMe((data as Participant) ?? null));
  }, [programId, router]);

  const toggleSession = (sessionId: string) => {
    const next = new Set(selectedSessionIds);
    next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId);
    setSelectedSessionIds(next);
  };

  const canSubmit = !!channel && (sessions.length === 0 || selectedSessionIds.size > 0);

  const submit = async () => {
    if (!canSubmit || !me || !program) return;
    setSaving(true);
    setError("");
    const { data: regData, error: regErr } = await supabase
      .from("registrations")
      .insert({ participant_id: me.id, program_id: program.id, acquisition_channel: channel, status: "applied" })
      .select()
      .single();

    let registrationId = regData?.id as string | undefined;
    if (regErr) {
      if (!regErr.message.includes("duplicate")) {
        setError("신청 처리 중 문제가 발생했습니다.");
        setSaving(false);
        return;
      }
      // 이미 신청되어 있던 경우 기존 registration id를 다시 조회
      const { data: existing } = await supabase.from("registrations").select("id").eq("participant_id", me.id).eq("program_id", program.id).maybeSingle();
      registrationId = existing?.id;
    }

    if (registrationId && selectedSessionIds.size > 0) {
      await supabase.from("registration_sessions").insert(
        [...selectedSessionIds].map((sessionId) => ({
          registration_id: registrationId,
          session_id: sessionId,
          participant_id: me.id,
          program_id: program.id,
        }))
      );
    }

    setSaving(false);
    router.push(`/programs/${program.id}`);
  };

  if (!program || me === undefined) return null;

  return (
    <div className="pb-24">
      <TopBar title="프로그램 신청" backHref={`/programs/${program.id}`} />
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-seafoam"><CheckCircle2 size={14} /> {me?.name}님으로 신청합니다</div>
        <p className="text-sm text-muted">{program.emoji} {program.title}</p>

        {sessions.length > 0 && (
          <div>
            <label className="text-xs font-medium flex items-center gap-1 mb-1.5 text-muted"><Calendar size={13} /> 참여할 회차를 선택해주세요</label>
            <div className="space-y-2">
              {sessions.map((s) => {
                const count = sessionCounts[s.id] ?? 0;
                const full = s.capacity !== null && count >= s.capacity;
                const checked = selectedSessionIds.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                      full && !checked ? "opacity-40 pointer-events-none" : "cursor-pointer"
                    } ${checked ? "border-coral bg-[#FBE4D8]" : "border-line bg-white"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} disabled={full && !checked} onChange={() => toggleSession(s.id)} />
                      <div>
                        <div className="text-sm font-medium text-ink">{s.session_label}</div>
                        <div className="text-xs text-muted">{s.session_date}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted flex-shrink-0">
                      {s.capacity !== null ? (full ? "마감" : `정원 ${s.capacity}명 중 ${count}명`) : "정원 제한 없음"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium block mb-1.5 text-muted">이 프로그램을 어떻게 알게 되었나요?</label>
          <ChipSelect options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
        </div>

        {error && <p className="text-xs text-coralDark">{error}</p>}
        <button disabled={!canSubmit || saving} onClick={submit} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40">
          {saving ? "신청 처리 중..." : "신청 완료하기"}
        </button>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageInner />
    </Suspense>
  );
}
