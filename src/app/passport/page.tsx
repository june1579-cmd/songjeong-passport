"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Stamp, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId, setStoredParticipantId } from "@/lib/participant-session";
import { Participant, Attendance, Program, Session, Registration } from "@/lib/types";
import StampBadge from "@/components/StampBadge";
import BottomNav from "@/components/BottomNav";
import JourneyCalendar, { CalendarEntry } from "@/components/JourneyCalendar";
import AmbientWaveSound from "@/components/AmbientWaveSound";

const MONTHLY_GOAL = 3;

export default function PassportPage() {
  const [me, setMe] = useState<Participant | null | undefined>(undefined); // undefined = loading
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [name, setName] = useState("");
  const [phone4, setPhone4] = useState("");
  const [error, setError] = useState("");

  const loadPassport = async (participant: Participant) => {
    setMe(participant);
    const { data: att } = await supabase.from("attendance").select("*").eq("participant_id", participant.id).order("checked_in_at", { ascending: true });
    setAttendance(att ?? []);
    const { data: regs } = await supabase.from("registrations").select("*").eq("participant_id", participant.id);
    setRegistrations(regs ?? []);
    const { data: progs } = await supabase.from("programs").select("*");
    setPrograms(progs ?? []);
    const { data: sess } = await supabase.from("sessions").select("*");
    setSessions(sess ?? []);
  };

  useEffect(() => {
    const pid = getStoredParticipantId();
    if (!pid) { setMe(null); return; }
    supabase.from("participants").select("*").eq("id", pid).single().then(({ data }) => (data ? loadPassport(data) : setMe(null)));
  }, []);

  const login = async () => {
    const { data } = await supabase.from("participants").select("*").eq("name", name.trim()).eq("phone4", phone4.trim()).maybeSingle();
    if (data) { setStoredParticipantId(data.id); loadPassport(data); setError(""); }
    else setError("일치하는 참여자 정보를 찾지 못했어요. 프로그램 신청 시 입력한 정보로 다시 확인해주세요.");
  };

  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    programs.forEach((p) => (map[p.id] = p));
    return map;
  }, [programs]);

  // 참여 여정: next_program_id 체인을 따라가며 완료/진행중/다음활동 상태 계산
  const journey = useMemo(() => {
    if (!programs.length) return [];
    const myProgramIds = new Set(registrations.map((r) => r.program_id));
    const pointedTo = new Set(programs.filter((p) => p.next_program_id).map((p) => p.next_program_id));
    const roots = programs.filter((p) => myProgramIds.has(p.id) && !pointedTo.has(p.id));
    const start = roots[0] ?? programs.find((p) => myProgramIds.has(p.id));
    if (!start) return [];

    const chain: Program[] = [];
    let current: Program | undefined = start;
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      chain.push(current);
      visited.add(current.id);
      current = current.next_program_id ? programMap[current.next_program_id] : undefined;
    }
    return chain;
  }, [programs, registrations, programMap]);

  if (me === undefined) return null;

  if (!me) {
    return (
      <div className="pb-24 px-5 pt-12 min-h-screen">
        <div className="text-center mb-6">
          <Stamp size={36} className="text-coral mx-auto mb-2" />
          <h2 className="font-display text-lg text-ink">내 패스포트 확인하기</h2>
          <p className="text-xs mt-1 text-muted">신청할 때 입력한 이름과 번호 뒤 4자리를 입력해주세요.</p>
        </div>
        <div className="space-y-3 max-w-sm mx-auto">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 또는 닉네임" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
          <input
            value={phone4}
            onChange={(e) => setPhone4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="휴대폰 뒤 4자리"
            inputMode="numeric"
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm"
          />
          {error && <p className="text-xs text-coralDark">{error}</p>}
          <button onClick={login} className="w-full py-3 rounded-xl font-display text-white text-sm bg-navy">확인하기</button>
          <Link href="/signup" className="block text-center text-xs text-coral pt-1">아직 계정이 없으신가요? 회원가입</Link>
        </div>
      <BottomNav />
      </div>
    );
  }

  const myPrograms = new Set(attendance.map((a) => a.program_id));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const visitsThisMonth = attendance.filter((a) => a.checked_in_at.slice(0, 7) === thisMonth).length;
  const progressPct = Math.min(100, Math.round((visitsThisMonth / MONTHLY_GOAL) * 100));

  // 타임라인: 지난 체크인(완료) + 신청했지만 아직 안 지난 예정 회차
  const attendedSessionIds = new Set(attendance.map((a) => a.session_id));
  const myProgramIds = new Set(registrations.filter((r) => r.status !== "cancelled" && r.status !== "rejected").map((r) => r.program_id));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions
    .filter((s) => myProgramIds.has(s.program_id) && s.session_date >= today && !attendedSessionIds.has(s.id))
    .sort((a, b) => a.session_date.localeCompare(b.session_date));

  const sessionById = useMemo(() => {
    const map: Record<string, Session> = {};
    sessions.forEach((s) => (map[s.id] = s));
    return map;
  }, [sessions]);

  const calendarEntries: CalendarEntry[] = [
    ...attendance.map((a) => {
      const s = sessionById[a.session_id];
      const prog = programMap[a.program_id];
      return {
        date: a.checked_in_at.slice(0, 10),
        time: s?.start_time?.slice(0, 5),
        emoji: prog?.emoji ?? "🌊",
        title: `${prog?.title ?? ""}${s ? ` (${s.session_label})` : ""}`,
        done: true,
      };
    }),
    ...upcoming.map((s) => {
      const prog = programMap[s.program_id];
      return {
        date: s.session_date,
        time: s.start_time?.slice(0, 5),
        emoji: prog?.emoji ?? "🌊",
        title: `${prog?.title ?? ""} (${s.session_label})`,
        done: false,
      };
    }),
  ];

  return (
    <div className="pb-24 min-h-screen">
      <div className="px-5 pt-8 pb-6 text-white" style={{ background: "linear-gradient(160deg, #0D3B4E, #155067 55%, #3F9179 140%)" }}>
        <p className="text-xs text-white/70">나의 송정 패스포트</p>
        <h2 className="font-display text-xl mt-1">{me.name}님</h2>
        <div className="flex gap-5 mt-4">
          <div><div className="font-display text-lg">{myPrograms.size}개</div><div className="text-[11px] text-white/70">활동 경험</div></div>
          <div><div className="font-display text-lg">{attendance.length}회</div><div className="text-[11px] text-white/70">총 참여</div></div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] text-white/70 mb-1.5">
            <span>이번 달 나의 송정활동</span>
            <span>{visitsThisMonth}회 / 목표 {MONTHLY_GOAL}회</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-coral transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <p className="text-sm font-medium px-1 mb-2 text-muted">송정 스탬프</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {attendance.map((a, i) => <StampBadge key={a.id} n={i + 1} filled />)}
          {Array.from({ length: Math.max(0, 8 - attendance.length) }).map((_, i) => (
            <StampBadge key={`empty-${i}`} n={attendance.length + i + 1} filled={false} />
          ))}
        </div>

        {journey.length > 1 && (
          <div className="mb-5">
            <p className="text-sm font-medium px-1 mb-2 text-muted">나의 송정 여정</p>
            <div className="rounded-xl border border-line bg-white p-4 space-y-3">
              {journey.map((p, i) => {
                const attended = myPrograms.has(p.id);
                const registered = registrations.some((r) => r.program_id === p.id && r.status !== "cancelled" && r.status !== "rejected");
                const label = attended ? "완료" : registered ? "진행중" : "다음 활동";
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 ${attended ? "bg-seafoamLight" : "bg-sand"}`}>
                      {attended ? <Check size={14} className="text-seafoam" /> : p.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-ink">{p.title}</p>
                      <p className="text-[11px] text-muted">{label}</p>
                    </div>
                    {i < journey.length - 1 && <ArrowRight size={14} className="text-line flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-5">
          <p className="text-sm font-medium px-1 mb-2 text-muted">나의 송정여정 (날짜별 보기)</p>
          <JourneyCalendar entries={calendarEntries} />
        </div>

        <p className="text-sm font-medium px-1 mb-2 text-muted">활동 타임라인</p>
        <div className="space-y-2">
          {attendance.length === 0 && upcoming.length === 0 && (
            <p className="text-xs px-1 text-muted">아직 체크인 기록이 없어요. 프로그램에 참여해보세요!</p>
          )}
          {upcoming.map((s) => {
            const prog = programMap[s.program_id];
            return (
              <div key={`up-${s.id}`} className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 bg-sandLight">
                <div className="text-xl">{prog?.emoji}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">{prog?.title}</div>
                  <div className="text-xs text-muted">{s.session_date} · {s.session_label}</div>
                </div>
                <span className="text-[11px] text-muted flex-shrink-0">예정</span>
              </div>
            );
          })}
          {[...attendance].reverse().map((a) => {
            const prog = programMap[a.program_id];
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 bg-white">
                <div className="text-xl">{prog?.emoji}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">{prog?.title}</div>
                  <div className="text-xs text-muted">{new Date(a.checked_in_at).toLocaleDateString("ko-KR")}</div>
                </div>
                <span className="text-[11px] text-seafoam flex-shrink-0 flex items-center gap-1"><Check size={12} /> 참여완료</span>
              </div>
            );
          })}
        </div>
      </div>
      <AmbientWaveSound />
      <BottomNav />
    </div>
  );
}
