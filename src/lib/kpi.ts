import { Attendance, Registration, Survey, Program } from "./types";

// 재참여 기준: 서로 다른 2개 이상의 프로그램에 출석 기록이 있는 참여자.
// (정확한 정의는 README의 "핵심 KPI 정의" 참고)
export function computeKpis(
  totalParticipants: number,
  registrations: Registration[],
  attendance: Attendance[]
) {
  const programsByParticipant = new Map<string, Set<string>>();
  attendance.forEach((a) => {
    const set = programsByParticipant.get(a.participant_id) ?? new Set<string>();
    set.add(a.program_id);
    programsByParticipant.set(a.participant_id, set);
  });

  const revisiters = [...programsByParticipant.values()].filter((s) => s.size >= 2).length;
  const attendedParticipants = programsByParticipant.size;
  const newOnly = attendedParticipants - revisiters;
  const revisitRate = attendedParticipants ? (revisiters / attendedParticipants) * 100 : 0;
  const avgVisits = totalParticipants ? attendance.length / totalParticipants : 0;

  return {
    totalParticipants,
    attendedParticipants,
    newOnly,
    revisiters,
    revisitRate,
    totalCheckins: attendance.length,
    avgVisits,
    programsByParticipant,
  };
}

export function computeConversion(
  fromProgramId: string,
  toProgramId: string,
  attendance: Attendance[]
) {
  const fromIds = new Set(attendance.filter((a) => a.program_id === fromProgramId).map((a) => a.participant_id));
  const toIds = new Set(attendance.filter((a) => a.program_id === toProgramId).map((a) => a.participant_id));
  const converted = [...fromIds].filter((id) => toIds.has(id)).length;
  const rate = fromIds.size ? (converted / fromIds.size) * 100 : 0;
  return { fromCount: fromIds.size, converted, rate };
}

export function computeSatisfaction(programId: string, surveys: Survey[]) {
  const list = surveys.filter((s) => s.program_id === programId);
  if (!list.length) return null;
  return list.reduce((sum, s) => sum + s.satisfaction, 0) / list.length;
}

export function generateInsights(
  programs: Program[],
  registrations: Registration[],
  attendance: Attendance[]
): string[] {
  const insights: string[] = [];

  // 채널별 재참여율 비교
  const channelStats = computeChannelBreakdown(registrations).map((c) => {
    const participantIds = new Set(registrations.filter((r) => r.acquisition_channel === c.channel).map((r) => r.participant_id));
    const revisiters = [...participantIds].filter((pid) => {
      const progs = new Set(attendance.filter((a) => a.participant_id === pid).map((a) => a.program_id));
      return progs.size >= 2;
    }).length;
    return { channel: c.channel, rate: participantIds.size ? (revisiters / participantIds.size) * 100 : 0, count: participantIds.size };
  }).filter((c) => c.count >= 3);
  const bestChannel = [...channelStats].sort((a, b) => b.rate - a.rate)[0];
  if (bestChannel && bestChannel.rate > 0) {
    insights.push(`'${bestChannel.channel}'을 통해 유입된 참여자의 재참여율이 ${bestChannel.rate.toFixed(0)}%로 가장 높습니다.`);
  }

  // 프로그램 간 전환 중 가장 높은 비율
  // 프로그램 간 재참여 전환 — 실제 "다음 추천 프로그램" 연결(next_program_id)만 사용
  let bestConversion: { from: string; to: string; rate: number } | null = null;
  const linkedPairs = programs
    .filter((p) => p.next_program_id)
    .map((p) => ({ from: p, to: programs.find((x) => x.id === p.next_program_id) }))
    .filter((pair): pair is { from: Program; to: Program } => !!pair.to);
  for (const { from, to } of linkedPairs) {
    const conv = computeConversion(from.id, to.id, attendance);
    if (conv.fromCount >= 3 && (!bestConversion || conv.rate > bestConversion.rate)) {
      bestConversion = { from: from.title, to: to.title, rate: conv.rate };
    }
  }
  if (bestConversion && bestConversion.rate > 0) {
    insights.push(`'${bestConversion.from}' 참가자의 ${bestConversion.rate.toFixed(0)}%가 '${bestConversion.to}'에도 참여했습니다.`);
  }

  return insights;
}

export function computeChannelBreakdown(registrations: Registration[]) {
  const counts = new Map<string, number>();
  registrations.forEach((r) => counts.set(r.acquisition_channel, (counts.get(r.acquisition_channel) ?? 0) + 1));
  const total = registrations.length || 1;
  return [...counts.entries()]
    .map(([channel, count]) => ({ channel, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}
