"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Program, Session } from "@/lib/types";

export default function QrPrintPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    supabase.from("programs").select("*").eq("id", id).single().then(({ data }) => setProgram(data));
    supabase.from("sessions").select("*").eq("id", sessionId).single().then(({ data }) => setSession(data));
  }, [id, sessionId]);

  if (!program || !session) return null;
  const url = `${origin}/checkin/${session.qr_token}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-sandLight print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0; }
          body { margin: 0; }
        }
      `}</style>

      <button onClick={() => window.print()} className="no-print mb-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-navy text-white font-display">
        <Printer size={16} /> 인쇄하기
      </button>

      <div className="w-full max-w-sm rounded-2xl border-2 border-navy bg-white p-8 text-center">
        <p className="text-xs text-muted mb-1">2026 송정동 평생학습 빌리지</p>
        <h1 className="font-display text-xl text-ink mb-1">{program.emoji} {program.title}</h1>
        <p className="text-sm font-medium text-navy mb-4">{session.session_label} 출석체크</p>

        <div className="text-xs text-muted mb-1">{session.session_date} · {session.start_time?.slice(0, 5)}~{session.end_time?.slice(0, 5)}</div>
        <div className="text-xs text-muted mb-6">{program.location}</div>

        <div className="flex justify-center mb-6">
          <QRCodeCanvas value={url} size={220} level="M" includeMargin />
        </div>

        <p className="font-display text-base text-navy mb-1">출석체크 QR</p>
        <p className="text-xs text-muted">휴대전화 카메라로 QR코드를 스캔해 주세요.</p>
      </div>
    </div>
  );
}
