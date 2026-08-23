"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Calendar, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { CHANNEL_OPTIONS, Program, Participant, Session, Registration } from "@/lib/types";
import TopBar from "@/components/TopBar";
import ChipSelect from "@/components/ChipSelect";

function JoinPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const programId = params.get("programId")!;
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [cohortCount, setCohortCount] = useState(0); // 고정 기수제 프로그램의 전체 신청 인원
  const [me, setMe] = useState<Participant | null | undefined>(undefined);
  const [existingRegistration, setExistingRegistration] = useState<Registration | null | undefined>(undefined);
  const [alreadySelectedIds, setAlreadySelectedIds] = useState<Set<string>>(new Set()); // 예전에 신청 시 이미 고른 회차
  const [channel, setChannel] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set()); // 이번에 새로 추가로 고르는 회차
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mySchedule, setMySchedule] = useState<{ program_id: string; session_date: string; start_time: string; end_time: string }[]>([]);

  const isFixed = program?.session_selection_mode === "fixed";
  const maxSelectable = program?.max_selectable_sessions ?? null;

  // 다른 프로그램에 이미 확정된 회차와 날짜·시간이 겹치는지 확인
  const conflictsWithSchedule = (s: Session) => {
    return mySchedule.some((entry) => {
      if (entry.program_id === programId) return false; // 같은 프로그램끼리는 겹침 체크 대상 아님
      if (entry.session_date !== s.session_date) return false;
      const sStart = s.start_time ?? "00:00:00";
      const sEnd = s.end_time ?? "23:59:59";
      return sStart < entry.end_time && entry.start_time < sEnd;
    });
  };

  useEffect(() => {
    supabase.from("programs").select("*").eq("id", programId).single().then(({ data }) => setProgram(data));
    supabase.from("sessions").select("*").eq("program_id", programId).order("session_date").then(({ data }) => setSessions(data ?? []));
    supabase.from("registration_sessions").select("session_id").eq("program_id", programId).then(({ data }) => {
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: { session_id: string }) => { counts[r.session_id] = (counts[r.session_id] ?? 0) + 1; });
      setSessionCounts(counts);
    });
    // 고정 기수제일 때 전체 신청 인원(취소/미선정 제외)을 확인
    supabase.rpc("rpc_program_registration_counts").then(({ data }) => {
      const row = (data ?? []).find((r: { program_id: string; active_count: number }) => r.program_id === programId);
      setCohortCount(row?.active_count ?? 0);
    });

    const pid = getStoredParticipantId();
    if (!pid) {
      router.replace(`/signup?next=${encodeURIComponent(`/join?programId=${programId}`)}`);
      return;
    }
    supabase.rpc("rpc_get_my_participant", { p_id: pid }).maybeSingle().then(({ data }) => {
      const participant = (data as Participant) ?? null;
      setMe(participant);
      if (!participant) { setExistingRegistration(null); return; }

      supabase.rpc("rpc_get_my_schedule", { p_participant_id: participant.id }).then(({ data: schedule }) => {
        setMySchedule(schedule ?? []);
      });

      // 이미 이 프로그램에 신청한 적이 있는지, 있다면 어떤 회차를 골랐었는지 확인 —
      // 단, 취소/미선정된 신청은 "이미 신청됨"으로 취급하지 않는다(다시 처음부터 신청 가능해야 함).
      supabase.rpc("rpc_get_my_registration_for_program", { p_participant_id: participant.id, p_program_id: programId }).then(({ data: regs }) => {
        const reg = (regs as Registration[] | null)?.[0] ?? null;
        const isActive = reg && reg.status !== "cancelled" && reg.status !== "rejected";
        setExistingRegistration(isActive ? reg : null);
        if (isActive) {
          setChannel(reg!.acquisition_channel);
          supabase.from("registration_sessions").select("session_id").eq("registration_id", reg!.id).then(({ data: rs }) => {
            setAlreadySelectedIds(new Set((rs ?? []).map((r: { session_id: string }) => r.session_id)));
          });
        }
      });
    });
  }, [programId, router]);

  const toggleSession = (sessionId: string) => {
    if (alreadySelectedIds.has(sessionId)) return; // 이미 신청된 회차는 건드릴 수 없음
    const next = new Set(selectedSessionIds);
    const totalSelected = alreadySelectedIds.size + next.size;
    if (next.has(sessionId)) {
      next.delete(sessionId);
    } else {
      if (maxSelectable !== null && totalSelected >= maxSelectable) return; // 최대 개수 도달 시 더 못 고름
      next.add(sessionId);
    }
    setSelectedSessionIds(next);
  };

  const cohortFull = isFixed && program?.capacity !== null && program !== null && cohortCount >= (program.capacity ?? Infinity);
  const alreadyFullyRegistered = isFixed && !!existingRegistration;
  const totalSelectedCount = alreadySelectedIds.size + selectedSessionIds.size;
  const fixedScheduleConflict = isFixed && !alreadyFullyRegistered && sessions.some((s) => conflictsWithSchedule(s));

  const canSubmit =
    !!channel && !cohortFull && !alreadyFullyRegistered && !fixedScheduleConflict && !me?.is_blacklisted &&
    (isFixed || sessions.length === 0 || selectedSessionIds.size > 0);

  const submit = async () => {
    if (!canSubmit || !me || !program) return;
    // 제출 직전 한 번 더 확인 (화면이 오래 열려있던 사이 다른 프로그램에 신청했을 수도 있음)
    const sessionsToCheck = isFixed ? sessions : sessions.filter((s) => selectedSessionIds.has(s.id));
    if (sessionsToCheck.some((s) => conflictsWithSchedule(s))) {
      setError("다른 프로그램과 일정이 겹쳐서 신청할 수 없어요. 화면을 새로고침해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    const { data: registrationId, error: regErr } = await supabase.rpc("rpc_create_registration", {
      p_participant_id: me.id,
      p_program_id: program.id,
      p_acquisition_channel: channel,
    });

    if (regErr || !registrationId) {
      setError("신청 처리 중 문제가 발생했습니다.");
      setSaving(false);
      return;
    }

    // 고정 기수제: 전체 회차 자동 등록. 자유 선택: 이번에 "새로" 고른 회차만 등록(이미 등록된 건 제외해서 충돌 방지).
    const sessionIdsToRegister = isFixed
      ? sessions.map((s) => s.id).filter((id) => !alreadySelectedIds.has(id))
      : [...selectedSessionIds];

    if (sessionIdsToRegister.length > 0) {
      const { error: sessErr } = await supabase.from("registration_sessions").insert(
        sessionIdsToRegister.map((sessionId) => ({
          registration_id: registrationId,
          session_id: sessionId,
          participant_id: me.id,
          program_id: program.id,
        }))
      );
      if (sessErr) {
        setError("회차 등록 중 문제가 발생했어요. 다시 시도해주세요.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push(`/programs/${program.id}`);
  };

  if (!program || me === undefined || existingRegistration === undefined) return null;

  return (
    <div className="pb-24">
      <TopBar title={existingRegistration ? "회차 추가 신청" : "프로그램 신청"} backHref={`/programs/${program.id}`} />
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-seafoam"><CheckCircle2 size={14} /> {me?.name}님으로 신청합니다</div>
        <p className="text-sm text-muted">{program.emoji} {program.title}</p>

        {me?.is_blacklisted ? (
          <div className="rounded-xl border border-coralDark bg-[#FBE4D8] p-3.5 text-sm text-coralDark">
            현재 참여가 제한된 계정이에요. 프로그램에 신청하실 수 없어요. 문의사항은 운영자에게 연락해주세요.
          </div>
        ) : (
        <>
        {alreadyFullyRegistered && (
          <div className="rounded-xl border border-seafoam bg-seafoamLight p-3.5 text-sm text-navy">
            이미 신청 완료된 프로그램이에요. 전체 회차에 등록되어 있어요.
          </div>
        )}

        {isFixed ? (
          !alreadyFullyRegistered && (
            <div className="rounded-xl border border-line bg-white p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Users size={13} className="text-navy" />
                <span className="text-xs font-medium text-navy">고정 기수제 프로그램이에요</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                이 프로그램은 처음 모집된 인원이 전체 {sessions.length}회차를 함께 진행해요. 신청하시면 회차를 따로 고르실 필요 없이 전체 일정에 자동으로 등록됩니다.
              </p>
              {program.capacity !== null && (
                <p className="text-xs text-muted mt-2">
                  모집 인원 {cohortCount}/{program.capacity}명{cohortFull && <span className="text-coralDark font-medium"> · 정원이 찼어요</span>}
                </p>
              )}
              {fixedScheduleConflict && (
                <p className="text-xs text-coralDark font-medium mt-2">
                  이미 신청하신 다른 프로그램과 회차 일정이 겹쳐서 이 프로그램은 신청할 수 없어요.
                </p>
              )}
              <div className="mt-2 space-y-1">
                {sessions.map((s) => (
                  <div key={s.id} className="text-[11px] text-muted flex justify-between">
                    <span>{s.session_label}</span>
                    <span>{s.session_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          sessions.length > 0 && (
            <div>
              <label className="text-xs font-medium flex items-center gap-1 mb-1.5 text-muted">
                <Calendar size={13} /> 참여할 회차를 선택해주세요
                {maxSelectable !== null && <span className="text-coral">(최대 {maxSelectable}회차, {totalSelectedCount}/{maxSelectable} 선택됨)</span>}
              </label>
              <div className="space-y-2">
                {sessions.map((s) => {
                  const count = sessionCounts[s.id] ?? 0;
                  const full = s.capacity !== null && count >= s.capacity;
                  const isAlready = alreadySelectedIds.has(s.id);
                  const conflict = !isAlready && conflictsWithSchedule(s);
                  const checked = isAlready || selectedSessionIds.has(s.id);
                  const limitReached = maxSelectable !== null && totalSelectedCount >= maxSelectable && !checked;
                  const disabled = isAlready || conflict || ((full || limitReached) && !checked);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                        disabled ? "opacity-70 pointer-events-none" : "cursor-pointer"
                      } ${checked ? "border-coral bg-[#FBE4D8]" : "border-line bg-white"} ${isAlready ? "opacity-100" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} disabled={isAlready || disabled} onChange={() => toggleSession(s.id)} />
                        <div>
                          <div className="text-sm font-medium text-ink">{s.session_label}</div>
                          <div className="text-xs text-muted">{s.session_date}{s.start_time ? ` · ${s.start_time.slice(0, 5)}~${s.end_time?.slice(0, 5)}` : ""}</div>
                        </div>
                      </div>
                      <span className={`text-[11px] flex-shrink-0 text-right whitespace-pre-line ${isAlready ? "text-seafoam font-medium" : conflict ? "text-coralDark font-medium" : "text-muted"}`}>
                        {isAlready ? "신청 완료" : conflict ? "다른 프로그램과\n시간 겹침" : s.capacity !== null ? (full ? "마감" : `정원 ${s.capacity}명 중 ${count}명`) : "정원 제한 없음"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )
        )}

        {!alreadyFullyRegistered && !existingRegistration && (
          <div>
            <label className="text-xs font-medium block mb-1.5 text-muted">이 프로그램을 어떻게 알게 되었나요?</label>
            <ChipSelect options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
          </div>
        )}

        {cohortFull && !alreadyFullyRegistered && <p className="text-xs text-coralDark">이 프로그램은 모집 인원이 마감되었어요.</p>}
        {error && <p className="text-xs text-coralDark">{error}</p>}
        {!alreadyFullyRegistered && (
          <button disabled={!canSubmit || saving} onClick={submit} className="w-full py-3.5 rounded-xl font-display text-white text-base bg-coral disabled:opacity-40">
            {saving ? "처리 중..." : existingRegistration ? "회차 추가하기" : "신청 완료하기"}
          </button>
        )}
        </>
        )}
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
