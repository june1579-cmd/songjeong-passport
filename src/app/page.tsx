"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Pin, Images } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { Program, Session, Registration, Attendance, Participant, Announcement, Photo, PROGRAM_CATEGORIES } from "@/lib/types";
import { computeCardStatus, nextUpcomingSession } from "@/lib/program-status";
import { categoryColor } from "@/lib/category-colors";
import ProgramCard from "@/components/ProgramCard";
import BottomNav from "@/components/BottomNav";
import PassportSummaryCard from "@/components/PassportSummaryCard";
import NextActivityCard from "@/components/NextActivityCard";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import AnnouncementModal from "@/components/AnnouncementModal";
import AmbientWaveSound from "@/components/AmbientWaveSound";
import PassportMark from "@/components/PassportMark";

function dateLabelFor(sessions: Session[], programId: string) {
  const list = sessions.filter((s) => s.program_id === programId).map((s) => s.session_date).sort();
  if (!list.length) return "";
  const fmt = (iso: string) => { const d = new Date(iso + "T00:00:00"); return `${d.getMonth() + 1}.${d.getDate()}`; };
  return list.length === 1 ? `${fmt(list[0])} · 10:00~12:00` : `${fmt(list[0])} ~ ${fmt(list[list.length - 1])} · 10:00~12:00`;
}

const FILTERS = ["전체", "이번주", ...PROGRAM_CATEGORIES];

export default function HomePage() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [me, setMe] = useState<Participant | null>(null);
  const [myRegs, setMyRegs] = useState<Registration[]>([]);
  const [myAttendance, setMyAttendance] = useState<Attendance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [slidePhotos, setSlidePhotos] = useState<Photo[]>([]);
  const [openAnnouncement, setOpenAnnouncement] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState("전체");

  useEffect(() => {
    (async () => {
      const { data: progs } = await supabase.from("programs").select("*").eq("is_published", true).order("created_at", { ascending: true });
      setPrograms(progs ?? []);
      const { data: sess } = await supabase.from("sessions").select("*");
      setSessions(sess ?? []);
      const { data: regCounts } = await supabase.rpc("rpc_program_registration_counts");
      const countMap: Record<string, number> = {};
      (regCounts ?? []).forEach((r: { program_id: string; active_count: number }) => (countMap[r.program_id] = r.active_count));
      setRegistrationCounts(countMap);
      const { data: ann } = await supabase
        .from("announcements")
        .select("*")
        .is("program_id", null)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      setAnnouncements(ann ?? []);

      // 진행 중인 프로그램들의 사진을 모아 슬라이드로 (최신순 최대 8장)
      const { data: photos } = await supabase.from("photos").select("*").not("program_id", "is", null).order("created_at", { ascending: false }).limit(8);
      setSlidePhotos(photos ?? []);

      const pid = getStoredParticipantId();
      if (pid) {
        const { data: participantRaw } = await supabase.rpc("rpc_get_my_participant", { p_id: pid }).maybeSingle();
        const participant = participantRaw as Participant | null;
        setMe(participant);
        if (participant) {
          const { data: mr } = await supabase.rpc("rpc_get_my_registrations", { p_participant_id: pid });
          setMyRegs(mr ?? []);
          const { data: ma } = await supabase.rpc("rpc_get_my_attendance", { p_participant_id: pid });
          setMyAttendance(ma ?? []);
        }
      }
    })();
  }, []);

  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    (programs ?? []).forEach((p) => (map[p.id] = p));
    return map;
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    if (!programs) return [];
    if (filter === "전체") return programs;
    if (filter === "이번주") {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return programs.filter((p) =>
        sessions.some((s) => s.program_id === p.id && new Date(s.session_date) >= now && new Date(s.session_date) <= weekLater)
      );
    }
    return programs.filter((p) => p.category === filter);
  }, [programs, filter, sessions]);

  // 다음 일정: 내가 신청한 프로그램 중 가장 가까운 미출석 회차
  const myNext = useMemo(() => {
    if (!programs || !myRegs.length) return null;
    for (const reg of myRegs) {
      if (reg.status === "rejected" || reg.status === "cancelled") continue;
      const program = programs.find((p) => p.id === reg.program_id);
      if (!program) continue;
      const progSessions = sessions.filter((s) => s.program_id === program.id);
      const next = nextUpcomingSession(progSessions, myAttendance);
      if (next) return { program, session: next };
    }
    return null;
  }, [programs, myRegs, sessions, myAttendance]);

  // 추천: 신청 안 한 프로그램 중 첫 번째 모집중 프로그램
  const recommend = useMemo(() => {
    if (!programs) return null;
    const myProgramIds = new Set(myRegs.map((r) => r.program_id));
    const candidate = programs.find((p) => !myProgramIds.has(p.id) && p.program_status === "recruiting");
    if (!candidate) return null;
    const progSessions = sessions.filter((s) => s.program_id === candidate.id);
    return { program: candidate, session: progSessions[0] ?? null };
  }, [programs, myRegs, sessions]);

  const visitsThisMonth = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return myAttendance.filter((a) => a.checked_in_at.slice(0, 7) === thisMonth).length;
  }, [myAttendance]);

  return (
    <div className="pb-24">
      {/* SECTION 1 — 지역 Hero */}
      <div
        className="relative overflow-hidden px-5 pt-9 pb-8 text-white"
        style={{ background: "linear-gradient(150deg, #0D3B4E 0%, #2E8FC0 38%, #3F9179 72%, #D98A1A 130%)" }}
      >
        <div className="absolute top-6 right-5 flex gap-1.5 opacity-70">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#DD5C7B" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#9C6FCB" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FBEBD2" }} />
        </div>
        <svg className="absolute -bottom-1 left-0 w-full opacity-25" viewBox="0 0 400 40" preserveAspectRatio="none" style={{ height: 40 }}>
          <path d="M0 20 Q 25 5 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20 V40 H0 Z" fill="#FAF6EE" />
        </svg>
        <div className="flex items-center gap-1.5 mb-3">
          <PassportMark size={22} className="text-white" />
          <span className="font-display text-sm tracking-wide">PassUp</span>
        </div>
        <h1 className="font-display text-2xl leading-tight mb-2">
          오늘의 경험이<br />다음으로 이어져요
        </h1>
        <p className="text-sm text-white/85">One passport, every experience.</p>
        <p className="text-xs text-white/70 mt-1">지역과 프로그램을 넘어, 하나로 이어지는 나의 경험 · 부산 해운대구 송정동에서 시작합니다</p>
      </div>

      <div className="px-4 -mt-4 relative z-10 space-y-3">
        <PassportSummaryCard identified={!!me} name={me?.name} visitsThisMonth={visitsThisMonth} stampCount={myAttendance.length} />

        {myNext ? (
          <NextActivityCard program={myNext.program} session={myNext.session} mode="myUpcoming" />
        ) : recommend ? (
          <NextActivityCard program={recommend.program} session={recommend.session} mode="recommend" />
        ) : null}
      </div>

      {slidePhotos.length > 0 && (
        <div className="px-4 mt-5">
          <p className="text-sm font-medium px-1 mb-2 text-muted">진행되는 프로그램 현장</p>
          <PhotoSlideshow photos={slidePhotos} programMap={programMap} />
          <Link href="/gallery" className="flex items-center justify-center gap-1 mt-2 text-xs font-medium text-navy py-2 rounded-lg border border-line bg-white">
            <Images size={14} /> 프로그램별 갤러리 전체보기
          </Link>
        </div>
      )}

      {announcements.length > 0 && (
        <div className="px-4 mt-5">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Megaphone size={14} className="text-navy" />
            <span className="text-sm font-medium text-navy">공지사항</span>
          </div>
          <div className="space-y-2">
            {announcements.map((a) => (
              <button key={a.id} onClick={() => setOpenAnnouncement(a)} className="w-full text-left rounded-xl border border-line bg-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {a.pinned && <Pin size={11} className="text-coral" />}
                  <span className="text-sm font-medium text-ink">{a.title}</span>
                </div>
                <span className="text-[11px] text-muted flex-shrink-0">자세히 &gt;</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 필터 칩 */}
      <div className="mt-5 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const isCategory = PROGRAM_CATEGORIES.includes(f);
            const active = filter === f;
            const col = isCategory ? categoryColor(f) : null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex-shrink-0 text-xs px-3.5 py-2 rounded-full font-medium border"
                style={
                  active
                    ? { background: col ? col.solid : "#0D3B4E", borderColor: col ? col.solid : "#0D3B4E", color: "white" }
                    : { background: col ? col.bg : "white", borderColor: col ? col.bg : "#E3DCC9", color: col ? col.text : "#22303B" }
                }
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        <p className="text-sm font-medium px-1 text-muted">참여할 수 있는 프로그램</p>
        {programs === null && <p className="text-xs text-muted px-1">불러오는 중...</p>}
        {filteredPrograms.map((p) => {
          const activeCount = registrationCounts[p.id] ?? 0;
          const totalCapacity = sessions.filter((s) => s.program_id === p.id).reduce((sum, s) => (s.capacity !== null ? sum + s.capacity : sum), 0) || p.capacity;
          const myReg = myRegs.find((r) => r.program_id === p.id);
          const myAttCount = myAttendance.filter((a) => a.program_id === p.id).length;
          const status = computeCardStatus(p, totalCapacity ?? null, activeCount, myReg, myAttCount);
          return (
            <ProgramCard
              key={p.id}
              program={p}
              dateLabel={dateLabelFor(sessions, p.id)}
              status={status}
              totalCapacity={totalCapacity ?? null}
              totalRegistrations={activeCount}
            />
          );
        })}
        {programs && filteredPrograms.length === 0 && <p className="text-xs text-muted px-1">해당하는 프로그램이 없어요.</p>}
      </div>

      <div className="px-4 mt-8 text-center">
        <a href="/privacy" className="text-[11px] text-muted/70">개인정보처리방침</a>
        <span className="text-[11px] text-muted/40 mx-1.5">·</span>
        <a href="/admin/login" className="text-[11px] text-muted/70">운영자 로그인</a>
      </div>

      {openAnnouncement && <AnnouncementModal announcement={openAnnouncement} onClose={() => setOpenAnnouncement(null)} />}

      <AmbientWaveSound />
      <BottomNav />
    </div>
  );
}
