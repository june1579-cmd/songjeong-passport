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
  const [status, setStatus] = useState<"idle" | "already" | "done" | "notfound" | "needsjoin" | "full" | "notselected">("idle");
  const [stampCount, setStampCount] = useState(0);

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

      const { data: reg } = await supabase
        .from("registrations")
        .select("status")
        .eq("participant_id", pid)
        .eq("program_id", sess.program_id)
        .maybeSingle();
      if (!reg || reg.status === "rejected" || reg.status === "cancelled" || reg.status === "waitlisted") {
        setStatus("notselected");
        return;
      }

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("participant_id", pid)
        .eq("session_id", sess.id)
        .maybeSingle();
      if (existing) setStatus("already");

      if (!existing && sess.capacity !== null) {
        const { count: sessionCount } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sess.id);
        if ((sessionCount ?? 0) >= sess.capacity) setStatus("full");
      }

      const { count } = await supabase.from("attendance").select("*", { count: "exact", head: true }).eq("participant_id", pid);
      setStampCount(count ?? 0);
    })();
  }, [token]);

  const confirm = async () => {
    if (!session || !program || !participantId) return;
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
