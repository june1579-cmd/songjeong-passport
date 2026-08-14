"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Program, Session } from "@/lib/types";

function QrCard({
  program,
  session,
  origin,
  registerContainer,
}: {
  program: Program;
  session: Session;
  origin: string;
  registerContainer: (key: string, el: HTMLDivElement | null) => void;
}) {
  const url = `${origin}/checkin/${session.qr_token}`;
  return (
    <div className="qr-card rounded-xl border border-line bg-white p-4 flex flex-col items-center text-center break-inside-avoid">
      <p className="text-xs text-muted mb-1">{program.emoji} {program.title}</p>
      <p className="font-display text-sm text-ink mb-3">{session.session_label} · {session.session_date}</p>
      <div ref={(el) => registerContainer(session.id, el)}>
        <QRCodeCanvas value={url} size={168} level="M" includeMargin />
      </div>
      <p className="text-[10px] text-muted mt-3 break-all">{url}</p>
    </div>
  );
}

export default function ProgramQrPage() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [origin, setOrigin] = useState("");
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setOrigin(window.location.origin);
    supabase.from("programs").select("*").eq("id", id).single().then(({ data }) => setProgram(data));
    supabase.from("sessions").select("*").eq("program_id", id).order("session_date").then(({ data }) => setSessions(data ?? []));
  }, [id]);

  const getCanvas = (sessionId: string): HTMLCanvasElement | null => {
    const container = containerRefs.current[sessionId];
    return container ? container.querySelector("canvas") : null;
  };

  const downloadOne = (session: Session) => {
    const canvas = getCanvas(session.id);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${program?.id}_${session.session_label}_QR.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadAll = () => sessions.forEach((s) => downloadOne(s));

  if (!program) return null;

  return (
    <div className="p-4 pb-16">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .qr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-4 no-print">
        <h1 className="font-display text-lg text-navy">{program.emoji} {program.title} · QR 코드</h1>
      </div>

      <div className="flex gap-2 mb-4 no-print">
        <button onClick={downloadAll} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg border border-line text-navy text-xs font-medium">
          <Download size={14} /> 전체 이미지로 저장
        </button>
        <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg bg-navy text-white text-xs font-medium">
          <Printer size={14} /> 인쇄하기
        </button>
      </div>

      <div className="qr-grid grid grid-cols-2 gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="relative">
            <QrCard
              program={program}
              session={s}
              origin={origin}
              registerContainer={(key, el) => (containerRefs.current[key] = el)}
            />
            <button onClick={() => downloadOne(s)} className="no-print absolute top-2 right-2 bg-white/90 rounded-full p-1.5 border border-line">
              <Download size={12} className="text-navy" />
            </button>
            <Link href={`/admin/programs/${program.id}/qr/${s.id}/print`} className="no-print absolute top-2 left-2 bg-white/90 rounded-full p-1.5 border border-line">
              <Printer size={12} className="text-navy" />
            </Link>
          </div>
        ))}
      </div>
      {sessions.length === 0 && <p className="text-xs text-muted no-print">등록된 회차가 없습니다. 먼저 프로그램 편집에서 회차를 추가해주세요.</p>}
    </div>
  );
}
