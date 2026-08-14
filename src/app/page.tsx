"use client";
import { useEffect, useMemo, useState } from "react";
import { Megaphone, Pin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { Program, Session, Registration, Attendance, Participant, Announcement, Photo, PROGRAM_CATEGORIES } from "@/lib/types";
import { computeCardStatus, nextUpcomingSession } from "@/lib/program-status";
import ProgramCard from "@/components/ProgramCard";
import BottomNav from "@/components/BottomNav";
import PassportSummaryCard from "@/components/PassportSummaryCard";
import NextActivityCard from "@/components/NextActivityCard";
import PhotoSlideshow from "@/components/PhotoSlideshow";
import AnnouncementModal from "@/components/AnnouncementModal";

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
  const [registrations, setRegistrations] = useState<Registration[]>([]);
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
      const { data: regs } = await supabase.from("registrations").select("*");
      setRegistrations(regs ?? []);
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
        const { data: participant } = await supabase.from("participants").select("*").eq("id", pid).single();
        setMe(participant);
        if (participant) {
          const { data: mr } = await supabase.from("registrations").select("*").eq("participant_id", pid);
          setMyRegs(mr ?? []);
          const { data: ma } = await supabase.from("attendance").select("*").eq("participant_id", pid);
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
      <div className="relative overflow-hidden px-5 pt-9 pb-8 text-white" style={{ background: "linear-gradient(160deg, #0D3B4E 0%, #155067 55%, #3F9179 140%)" }}>
        <svg className="absolute -bottom-1 left-0 w-full opacity-25" viewBox="0 0 400 40" preserveAspectRatio="none" style={{ height: 40 }}>
          <path d="M0 20 Q 25 5 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20 V40 H0 Z" fill="#FAF6EE" />
        </svg>
        <p className="text-xs text-white/70 mb-2 tracking-wide">부산 해운대구 송정동</p>
        <h1 className="font-display text-2xl leading-tight mb-2">
          송정에서 배우고<br />경험을 쌓아보세요
        </h1>
        <p className="text-sm text-white/80">바다와 마을에서 만나는 우리 동네 평생학습</p>
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
              <button key={a.id} onClick={() => setOpenAnnouncement(a)} className="w-full text-left rounded-xl border border-line bg-white p-3">
                <div className="flex items-center gap-1.5">
                  {a.pinned && <Pin size={11} className="text-coral" />}
                  <span className="text-sm font-medium text-ink">{a.title}</span>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">{a.content}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 필터 칩 */}
      <div className="mt-5 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-xs px-3.5 py-2 rounded-full font-medium ${
                filter === f ? "bg-navy text-white" : "bg-white border border-line text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3">
        <p className="text-sm font-medium px-1 text-muted">참여할 수 있는 프로그램</p>
        {programs === null && <p className="text-xs text-muted px-1">불러오는 중...</p>}
        {filteredPrograms.map((p) => {
          const progRegs = registrations.filter((r) => r.program_id === p.id && r.status !== "cancelled" && r.status !== "rejected");
          const totalCapacity = sessions.filter((s) => s.program_id === p.id).reduce((sum, s) => (s.capacity !== null ? sum + s.capacity : sum), 0) || p.capacity;
          const myReg = myRegs.find((r) => r.program_id === p.id);
          const myAttCount = myAttendance.filter((a) => a.program_id === p.id).length;
          const status = computeCardStatus(p, totalCapacity ?? null, progRegs.length, myReg, myAttCount);
          return (
            <ProgramCard
              key={p.id}
              program={p}
              dateLabel={dateLabelFor(sessions, p.id)}
              status={status}
              totalCapacity={totalCapacity ?? null}
              totalRegistrations={progRegs.length}
            />
          );
        })}
        {programs && filteredPrograms.length === 0 && <p className="text-xs text-muted px-1">해당하는 프로그램이 없어요.</p>}
      </div>

      <div className="px-4 mt-8 text-center">
        <a href="/admin/login" className="text-[11px] text-muted/70">운영자 로그인</a>
      </div>

      {openAnnouncement && <AnnouncementModal announcement={openAnnouncement} onClose={() => setOpenAnnouncement(null)} />}

      <BottomNav />
    </div>
  );
}
