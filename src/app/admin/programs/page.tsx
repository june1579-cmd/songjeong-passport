"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, QrCode, Pencil, Eye, EyeOff, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Program, PROGRAM_STATUS_LABEL } from "@/lib/types";
import Pill from "@/components/Pill";

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [counts, setCounts] = useState<Record<string, { applied: number; selected: number }>>({});

  const load = () => {
    supabase.from("programs").select("*").order("created_at").then(({ data }) => setPrograms(data ?? []));
    supabase.rpc("rpc_program_registration_counts").then(({ data }) => {
      const map: Record<string, { applied: number; selected: number }> = {};
      (data ?? []).forEach((r: { program_id: string; active_count: number; selected_count: number }) => {
        map[r.program_id] = { applied: r.active_count, selected: r.selected_count };
      });
      setCounts(map);
    });
  };
  useEffect(load, []);

  const togglePublish = async (p: Program) => {
    await supabase.from("programs").update({ is_published: !p.is_published }).eq("id", p.id);
    load();
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg text-navy">프로그램 관리</h1>
        <Link href="/admin/programs/new" className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-full bg-coral text-white">
          <Plus size={14} /> 새 프로그램
        </Link>
      </div>

      {programs.map((p) => (
        <div key={p.id} className="rounded-xl border border-line p-3 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{p.emoji}</span>
              <span className="font-medium text-sm text-ink">{p.title}</span>
            </div>
            <Pill tone={p.is_published ? "seafoam" : "sand"}>{PROGRAM_STATUS_LABEL[p.program_status] ?? (p.is_published ? "게시중" : "비공개")}</Pill>
          </div>
          <p className="text-xs text-muted line-clamp-2">{p.description}</p>
          <p className="text-[11px] text-navy font-medium">
            신청 {counts[p.id]?.applied ?? 0}명 · 선정 {counts[p.id]?.selected ?? 0}명
          </p>
          <div className="flex gap-2 pt-1">
            <Link href={`/admin/programs/${p.id}/applications`} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg border border-line text-navy">
              <Users size={13} /> 신청자
            </Link>
            <Link href={`/admin/programs/${p.id}/edit`} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg border border-line text-navy">
              <Pencil size={13} /> 편집
            </Link>
            <Link href={`/admin/programs/${p.id}/qr`} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg border border-line text-navy">
              <QrCode size={13} /> QR 코드
            </Link>
            <button onClick={() => togglePublish(p)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-2 rounded-lg border border-line text-navy">
              {p.is_published ? <><EyeOff size={13} /> 비공개로</> : <><Eye size={13} /> 게시하기</>}
            </button>
          </div>
        </div>
      ))}
      {programs.length === 0 && <p className="text-xs text-muted">등록된 프로그램이 없습니다.</p>}
    </div>
  );
}
