"use client";
import { useEffect, useState } from "react";
import { BarChart3, ArrowRight, Users, Lightbulb } from "lucide-react";
import { Program, Registration, Attendance, Survey } from "@/lib/types";
import { computeKpis, computeConversion, computeSatisfaction, computeChannelBreakdown, generateInsights } from "@/lib/kpi";
import KpiCard from "@/components/KpiCard";
import Pill from "@/components/Pill";

export default function AdminDashboardPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        const { programs: progs, registrations: regs, attendance: att, surveys: svs, participantsCount: pc } = await res.json();
        setPrograms(progs ?? []);
        setRegistrations(regs ?? []);
        setAttendance(att ?? []);
        setSurveys(svs ?? []);
        setParticipantsCount(pc ?? 0);
      } catch {
        // 실패 시 빈 상태로 유지
      }
    })();
  }, []);

  const kpi = computeKpis(participantsCount, registrations, attendance);
  const channelBreakdown = computeChannelBreakdown(registrations);
  const publishedPrograms = programs.filter((p) => p.is_published);
  const insights = generateInsights(publishedPrograms, registrations, attendance);

  const validRegs = registrations.filter((r) => r.status !== "cancelled" && r.status !== "rejected");
  const attendedParticipants = new Set(attendance.map((a) => a.participant_id)).size;

  // 실제 "다음 추천 프로그램" 연결(next_program_id)만 흐름으로 계산한다.
  // (예전엔 목록에 나열된 순서대로 앞뒤를 붙여서 실제 설정과 안 맞는 조합이 나왔었다.)
  const flowPairs = publishedPrograms
    .filter((p) => p.next_program_id)
    .map((p) => ({ from: p, to: publishedPrograms.find((x) => x.id === p.next_program_id) }))
    .filter((pair): pair is { from: Program; to: Program } => !!pair.to);

  const convertedToNext = flowPairs.reduce((sum, { from, to }) => sum + computeConversion(from.id, to.id, attendance).converted, 0);
  const funnel = [
    { label: "신청", value: validRegs.length },
    { label: "참석", value: attendedParticipants },
    { label: "다음 프로그램 참여", value: convertedToNext },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  const today = new Date();
  const rangeStart = "2026.08.01";
  const rangeEnd = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <div className="px-4 pt-4">
        <h1 className="font-display text-lg text-navy">PassUp 운영 현황</h1>
        <p className="text-xs text-muted mt-0.5">{rangeStart} – {rangeEnd}</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        <KpiCard label="총 참여자" value={`${kpi.totalParticipants}명`} />
        <KpiCard label="신규 참여자" value={`${kpi.newOnly}명`} />
        <KpiCard label="재참여자" value={`${kpi.revisiters}명`} />
        <KpiCard label="재참여율" value={`${kpi.revisitRate.toFixed(1)}%`} highlight />
        <KpiCard label="총 체크인" value={`${kpi.totalCheckins}회`} />
        <KpiCard label="평균 참여 횟수" value={`${kpi.avgVisits.toFixed(1)}회`} />
      </div>

      {insights.length > 0 && (
        <div className="px-4 mb-1">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Lightbulb size={14} className="text-navy" />
            <span className="text-sm font-medium text-navy">이번 사업에서 확인된 변화</span>
          </div>
          <div className="space-y-2">
            {insights.map((text, i) => (
              <div key={i} className="rounded-xl border border-seafoam bg-seafoamLight p-3 text-sm text-navy">
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-5">
        <p className="text-sm font-medium mb-2 px-1 text-navy">참여 퍼널</p>
        <div className="rounded-xl border border-line bg-white p-4 space-y-3">
          {funnel.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-xs mb-1"><span className="text-ink">{f.label}</span><span className="font-medium text-navy">{f.value}명</span></div>
              <div className="h-2.5 rounded-full bg-sand">
                <div className="h-2.5 rounded-full bg-navy" style={{ width: `${(f.value / funnelMax) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <BarChart3 size={14} className="text-navy" />
          <span className="text-sm font-medium text-navy">프로그램별 현황</span>
        </div>
        <div className="rounded-xl border border-line overflow-hidden bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sand text-navy">
                <th className="text-left p-2 font-medium">프로그램</th>
                <th className="text-right p-2 font-medium">신청</th>
                <th className="text-right p-2 font-medium">참석</th>
                <th className="text-right p-2 font-medium">만족도</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => {
                const applied = registrations.filter((r) => r.program_id === p.id).length;
                const attended = new Set(attendance.filter((a) => a.program_id === p.id).map((a) => a.participant_id)).size;
                const sat = computeSatisfaction(p.id, surveys);
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="p-2">{p.emoji} {p.title} {!p.is_published && <span className="text-muted">(비공개)</span>}</td>
                    <td className="p-2 text-right">{applied}</td>
                    <td className="p-2 text-right">{attended}</td>
                    <td className="p-2 text-right">{sat ? sat.toFixed(1) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <ArrowRight size={14} className="text-navy" />
          <span className="text-sm font-medium text-navy">프로그램 참여 흐름</span>
        </div>
        <div className="space-y-2">
          {flowPairs.map(({ from, to }) => {
            const conv = computeConversion(from.id, to.id, attendance);
            return (
              <div key={from.id} className="rounded-xl border border-line p-3 flex items-center gap-2 bg-white">
                <span className="text-sm">{from.emoji} {from.title}</span>
                <ArrowRight size={14} className="text-muted" />
                <span className="text-sm flex-1">{to.emoji} {to.title}</span>
                <Pill tone="coral">{conv.converted}명 · {conv.rate.toFixed(0)}%</Pill>
              </div>
            );
          })}
          {flowPairs.length === 0 && (
            <p className="text-xs text-muted px-1">
              아직 "다음 추천 프로그램" 연결이 설정된 프로그램이 없어요. 프로그램 편집 화면에서 설정할 수 있어요.
            </p>
          )}
        </div>
      </div>

      <div className="px-4 mt-5 mb-6">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <Users size={14} className="text-navy" />
          <span className="text-sm font-medium text-navy">유입경로</span>
        </div>
        <div className="rounded-xl border border-line p-3 space-y-2 bg-white">
          {channelBreakdown.map((c) => (
            <div key={c.channel}>
              <div className="flex justify-between text-xs mb-1"><span className="text-ink">{c.channel}</span><span className="text-muted">{c.pct.toFixed(0)}%</span></div>
              <div className="h-2 rounded-full bg-sand">
                <div className="h-2 rounded-full bg-coral" style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
