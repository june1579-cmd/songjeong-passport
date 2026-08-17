"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QrCode, Stamp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { Session, Program } from "@/lib/types";
import StampBadge from "@/components/StampBadge";

export default function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "already" | "done" | "notfound" | "needsjoin" | "full" | "notselected" | "toosoon" | "expired">("idle");
  const [stampCount, setStampCount] = useState(0);

  // 체크인 허용 시간: 회차 시작 30분 전 ~ 종료 90분 후. QR을 미리 찍어두고
  // 실제 참여 없이 아무 때나 체크인해 스탬프만 얻는 것을 막기 위함.
  const getWindow = (sessionDate: string, startTime: string | null, endTime: string | null) => {
    const start = new Date(`${sessionDate}T${startTime ?? "10:00:00"}`);
    const end = new Date(`${sessionDate}T${endTime ?? "12:00:00"}`);
    const windowStart = new Date(start.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(end.getTime() + 90 * 60 * 1000);
    return { windowStart, windowEnd };
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.from("sessions").select("*").eq("qr_token", token).maybeSingle();
      if (!sess) {
        setStatus("notfound");
        return;
      }
      setSession(sess);
      const { data: prog } = await supabase.from("programs").select("*").eq("id", sess.program_id).single();
      setProgram(prog);

      const pid = getStoredParticipantId();
      if (!pid) {
        setStatus("needsjoin");
        return;
      }
      setParticipantId(pid);

      const { data: regs } = await supabase.rpc("rpc_get_my_registration_for_program", { p_participant_id: pid, p_program_id: sess.program_id });
      const reg = regs?.[0];
      if (!reg || reg.status === "rejected" || reg.status === "cancelled" || reg.status === "waitlisted") {
        setStatus("notselected");
        return;
      }

      const { data: existingRows } = await supabase.rpc("rpc_check_attendance", { p_participant_id: pid, p_session_id: sess.id });
      const existing = existingRows?.[0];
      if (existing) setStatus("already");

      if (!existing) {
        const { windowStart, windowEnd } = getWindow(sess.session_date, sess.start_time, sess.end_time);
        const now = new Date();
        if (now < windowStart) { setStatus("toosoon"); return; }
        if (now > windowEnd) { setStatus("expired"); return; }
      }

      if (!existing && sess.capacity !== null) {
        const { data: sessionCounts } = await supabase.rpc("rpc_session_attendance_counts", { p_program_id: sess.program_id });
        const sessionCount = (sessionCounts ?? []).find((c: { session_id: string; cnt: number }) => c.session_id === sess.id)?.cnt ?? 0;
        if (sessionCount >= sess.capacity) setStatus("full");
      }

      const { data: myAtt } = await supabase.rpc("rpc_get_my_attendance", { p_participant_id: pid });
      setStampCount((myAtt ?? []).length);
    })();
  }, [token]);

  const confirm = async () => {
    if (!session || !program || !participantId) return;
    const { windowStart, windowEnd } = getWindow(session.session_date, session.start_time, session.end_time);
    const now = new Date();
    if (now < windowStart) { setStatus("toosoon"); return; }
    if (now > windowEnd) { setStatus("expired"); return; }
    const { error } = await supabase.from("attendance").insert({
      participant_id: participantId,
      program_id: program.id,
      session_id: session.id,
    });
    if (!error) {
      await supabase.from("stamps").insert({ participant_id: participantId, program_id: program.id, session_id: session.id });
      setStampCount((n) => n + 1);
      setStatus("done");
    } else if (error.message.includes("duplicate")) {
      setStatus("already");
    }
  };

  if (status === "notfound") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center bg-navy text-white">
        유효하지 않은 QR입니다. 현장 운영자에게 문의해주세요.
      </div>
    );
  }

  if (status === "needsjoin" && program) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-navy text-white">
        <p className="text-sm text-white/70 mb-4">체크인하려면 먼저 참여 신청이 필요해요.</p>
        <button
          onClick={() => router.push(`/join?programId=${program.id}`)}
          className="px-5 py-3 rounded-xl font-display bg-coral"
        >
          {program.emoji} {program.title} 신청하기
        </button>
      </div>
    );
  }

  if (status === "notselected") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-navy text-white">
        <p className="text-sm text-white/80 mb-2">{program?.emoji} {program?.title}</p>
        <h2 className="font-display text-lg mb-2">이 프로그램의 출석 대상이 아니에요</h2>
        <p className="text-xs text-white/60 mb-6">선정 결과를 확인하시거나 운영자에게 문의해주세요.</p>
        <button onClick={() => router.push(`/programs/${program?.id}`)} className="px-5 py-3 rounded-xl font-display bg-coral">
          프로그램으로 돌아가기
        </button>
      </div>
    );
  }

  if (status === "full") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-navy text-white">
        <p className="text-sm text-white/80 mb-2">{program?.emoji} {program?.title}</p>
        <h2 className="font-display text-lg mb-2">이 회차는 정원이 마감되었어요</h2>
        <p className="text-xs text-white/60 mb-6">다른 회차를 확인해주세요.</p>
        <button onClick={() => router.push(`/programs/${program?.id}`)} className="px-5 py-3 rounded-xl font-display bg-coral">
          다른 회차 보기
        </button>
      </div>
    );
  }

  if (status === "toosoon" && session && program) {
    const { windowStart } = getWindow(session.session_date, session.start_time, session.end_time);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-navy text-white">
        <p className="text-sm text-white/80 mb-2">{program.emoji} {program.title}</p>
        <h2 className="font-display text-lg mb-2">아직 체크인할 수 있는 시간이 아니에요</h2>
        <p className="text-xs text-white/60 mb-2">{session.session_label} · {session.session_date} {session.start_time?.slice(0, 5)}</p>
        <p className="text-xs text-white/60 mb-6">
          {windowStart.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}부터 체크인할 수 있어요. 현장에서 시작 시간에 맞춰 다시 스캔해주세요.
        </p>
        <button onClick={() => router.push(`/programs/${program.id}`)} className="px-5 py-3 rounded-xl font-display bg-coral">
          프로그램으로 돌아가기
        </button>
      </div>
    );
  }

  if (status === "expired" && program && session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-navy text-white">
        <p className="text-sm text-white/80 mb-2">{program.emoji} {program.title}</p>
        <h2 className="font-display text-lg mb-2">체크인 가능 시간이 지났어요</h2>
        <p className="text-xs text-white/60 mb-6">{session.session_label} 회차는 종료되었습니다. 출석에 문제가 있다면 운영자에게 문의해주세요.</p>
        <button onClick={() => router.push(`/programs/${program.id}`)} className="px-5 py-3 rounded-xl font-display bg-coral">
          프로그램으로 돌아가기
        </button>
      </div>
    );
  }

  if (!session || !program) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-navy">
      {status === "idle" && (
        <>
          <QrCode size={64} className="text-white mb-4" />
          <p className="text-white/70 text-xs mb-1">{program.emoji} {program.title}</p>
          <h2 className="font-display text-xl text-white mb-1">오늘 프로그램에</h2>
          <h2 className="font-display text-xl text-white mb-6">참여하시겠습니까?</h2>
          <p className="text-white/60 text-xs mb-8">{session.session_label} · {session.session_date}</p>
          <button onClick={confirm} className="w-full py-3.5 rounded-xl font-display text-base bg-coral text-white">
            참여 확인
          </button>
          <button onClick={() => router.push(`/programs/${program.id}`)} className="mt-3 text-white/60 text-xs">
            취소
          </button>
        </>
      )}
      {(status === "done" || status === "already") && (
        <>
          <div className="mb-4"><StampBadge n={0} filled /></div>
          <h2 className="font-display text-xl text-white mb-2">{program.emoji} {program.title} 참여 완료!</h2>
          <p className="text-white/70 text-sm mb-1">스탬프 +1 · 총 {stampCount}개</p>
          <div className="flex gap-3 mt-8 w-full">
            <button
              onClick={() => router.push(`/survey/${program.id}`)}
              className="flex-1 py-3 rounded-xl font-display text-sm bg-coral text-white"
            >
              만족도 남기기
            </button>
            <button
              onClick={() => router.push(`/programs/${program.id}`)}
              className="flex-1 py-3 rounded-xl font-display text-sm border border-white/30 text-white"
            >
              계속 보기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
