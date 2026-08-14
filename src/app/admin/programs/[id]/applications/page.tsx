"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Program, Registration, Participant, Attendance, ApplicationStatus, APPLICATION_STATUS_LABEL } from "@/lib/types";
import Pill from "@/components/Pill";

interface Row {
  registration: Registration;
  participant: Participant;
  priorVisits: number; // 이 참여자가 다른 프로그램에서 출석한 횟수 (기존 참여 이력)
}

const STATUS_TONE: Record<ApplicationStatus, "sand" | "seafoam" | "coral"> = {
  applied: "sand",
  selected: "seafoam",
  waitlisted: "coral",
  rejected: "sand",
  cancelled: "sand",
};

export default function ApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");

  const load = async () => {
    const { data: prog } = await supabase.from("programs").select("*").eq("id", id).single();
    setProgram(prog);

    const { data: regs } = await supabase.from("registrations").select("*").eq("program_id", id).order("registered_at");
    const participantIds = (regs ?? []).map((r) => r.participant_id);
    if (!participantIds.length) { setRows([]); return; }

    const { data: participants } = await supabase.from("participants").select("*").in("id", participantIds);
    const { data: allAttendance } = await supabase.from("attendance").select("participant_id, program_id").in("participant_id", participantIds);

    const priorVisitsMap: Record<string, Set<string>> = {};
    (allAttendance as Attendance[] ?? []).forEach((a) => {
      priorVisitsMap[a.participant_id] = priorVisitsMap[a.participant_id] ?? new Set();
      priorVisitsMap[a.participant_id].add(a.program_id);
    });

    const list: Row[] = (regs ?? [])
      .map((r) => {
        const participant = (participants ?? []).find((p) => p.id === r.participant_id);
        if (!participant) return null;
        return { registration: r, participant, priorVisits: priorVisitsMap[r.participant_id]?.size ?? 0 };
      })
      .filter(Boolean) as Row[];
    setRows(list);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.registration.status === filter);

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((r) => r.registration.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const bulkUpdate = async (status: ApplicationStatus) => {
    if (!selectedIds.size) return;
    await supabase.from("registrations").update({ status }).in("id", [...selectedIds]);
    setSelectedIds(new Set());
    load();
  };

  const counts = {
    total: rows.length,
    selected: rows.filter((r) => r.registration.status === "selected").length,
    waitlisted: rows.filter((r) => r.registration.status === "waitlisted").length,
    rejected: rows.filter((r) => r.registration.status === "rejected").length,
  };

  const downloadCsv = () => {
    const header = ["이름", "연령대", "거주지역", "유입경로", "신청일", "기존참여횟수", "상태"];
    const lines = rows.map((r) => [
      r.participant.name,
      r.participant.age_group,
      r.participant.residence_area,
      r.registration.acquisition_channel,
      new Date(r.registration.registered_at).toLocaleDateString("ko-KR"),
      String(r.priorVisits),
      APPLICATION_STATUS_LABEL[r.registration.status],
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${program?.id ?? "program"}_신청자.csv`;
    link.click();
  };

  if (!program) return null;

  return (
    <div className="p-4 pb-16">
      <h1 className="font-display text-lg text-navy mb-1">{program.emoji} {program.title} · 신청자 관리</h1>
      <p className="text-xs text-muted mb-4">
        신청 {counts.total}명 · 선정 {counts.selected}명 · 대기 {counts.waitlisted}명 · 미선정 {counts.rejected}명
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {(["all", "applied", "selected", "waitlisted", "rejected", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${filter === f ? "bg-navy text-white" : "bg-sand text-navy"}`}
          >
            {f === "all" ? "전체" : APPLICATION_STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => bulkUpdate("selected")} disabled={!selectedIds.size} className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg bg-seafoam text-white disabled:opacity-30">
          <Check size={13} /> 선정 처리
        </button>
        <button onClick={() => bulkUpdate("waitlisted")} disabled={!selectedIds.size} className="text-xs font-medium px-3 py-2 rounded-lg bg-coral text-white disabled:opacity-30">
          대기 처리
        </button>
        <button onClick={() => bulkUpdate("rejected")} disabled={!selectedIds.size} className="text-xs font-medium px-3 py-2 rounded-lg border border-line text-ink disabled:opacity-30">
          미선정 처리
        </button>
        <button onClick={() => bulkUpdate("cancelled")} disabled={!selectedIds.size} className="text-xs font-medium px-3 py-2 rounded-lg border border-line text-muted disabled:opacity-30">
          취소 처리
        </button>
        <button onClick={downloadCsv} className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg border border-line text-navy ml-auto">
          <Download size={13} /> CSV 다운로드
        </button>
      </div>

      <div className="rounded-xl border border-line overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-sand text-navy">
              <th className="p-2"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filtered.length} onChange={toggleAll} /></th>
              <th className="text-left p-2 font-medium">이름</th>
              <th className="text-left p-2 font-medium">연령대</th>
              <th className="text-left p-2 font-medium">거주지역</th>
              <th className="text-left p-2 font-medium">유입경로</th>
              <th className="text-center p-2 font-medium">기존참여</th>
              <th className="text-left p-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.registration.id} className="border-t border-line">
                <td className="p-2"><input type="checkbox" checked={selectedIds.has(r.registration.id)} onChange={() => toggleOne(r.registration.id)} /></td>
                <td className="p-2">{r.participant.name}</td>
                <td className="p-2">{r.participant.age_group}</td>
                <td className="p-2">{r.participant.residence_area}</td>
                <td className="p-2">{r.registration.acquisition_channel}</td>
                <td className="p-2 text-center">{r.priorVisits}</td>
                <td className="p-2"><Pill tone={STATUS_TONE[r.registration.status]}>{APPLICATION_STATUS_LABEL[r.registration.status]}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-xs text-muted p-4">해당하는 신청자가 없습니다.</p>}
      </div>
    </div>
  );
}
