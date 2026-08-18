"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Check, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Program, Registration, Participant, ApplicationStatus, APPLICATION_STATUS_LABEL, Notification } from "@/lib/types";
import Pill from "@/components/Pill";

interface Row {
  registration: Registration;
  participant: Participant;
  priorVisits: number;
  sessionLabels: string;
}

const STATUS_TONE: Record<ApplicationStatus, "sand" | "seafoam" | "coral"> = {
  applied: "sand",
  selected: "seafoam",
  waitlisted: "coral",
  rejected: "sand",
  cancelled: "sand",
};

const STATUS_STRIPE: Record<ApplicationStatus, string> = {
  applied: "#D9CBA3",
  selected: "#4E9C82",
  waitlisted: "#EC7A4E",
  rejected: "#C9BFA8",
  cancelled: "#C9BFA8",
};

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "요청 실패");
  return res.json();
}

export default function ApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [notifications, setNotifications] = useState<(Notification & { participant_name: string })[]>([]);
  const [attendanceData, setAttendanceData] = useState<{ participant_id: string; session_id: string; checked_in_at: string }[]>([]);
  const [sessionsData, setSessionsData] = useState<{ id: string; session_label: string; session_date: string }[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    const { data: prog } = await supabase.from("programs").select("*").eq("id", id).single();
    setProgram(prog);

    try {
      const { registrations, participants, priorVisitsMap, notifications: notifs, attendance, sessions, registrationSessions } = await api(`/api/admin/applications/${id}`);
      const sessionMap: Record<string, string> = {};
      (sessions ?? []).forEach((s: { id: string; session_label: string }) => (sessionMap[s.id] = s.session_label));
      const labelsByRegistration: Record<string, string[]> = {};
      (registrationSessions ?? []).forEach((rs: { registration_id: string; session_id: string }) => {
        labelsByRegistration[rs.registration_id] = labelsByRegistration[rs.registration_id] ?? [];
        if (sessionMap[rs.session_id]) labelsByRegistration[rs.registration_id].push(sessionMap[rs.session_id]);
      });
      const list: Row[] = (registrations ?? [])
        .map((r: Registration) => {
          const participant = (participants ?? []).find((p: Participant) => p.id === r.participant_id);
          if (!participant) return null;
          const labels = labelsByRegistration[r.id];
          const sessionLabels = labels?.length ? labels.join(", ") : "-";
          return { registration: r, participant, priorVisits: priorVisitsMap?.[r.participant_id] ?? 0, sessionLabels };
        })
        .filter(Boolean) as Row[];
      setRows(list);
      setNotifications(notifs ?? []);
      setAttendanceData(attendance ?? []);
      setSessionsData(sessions ?? []);
    } catch (e: any) {
      setError(e.message ?? "불러오기에 실패했습니다.");
    }
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
    try {
      await api(`/api/admin/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ registrationIds: [...selectedIds], status }),
      });
    } catch (e: any) {
      setError(e.message ?? "처리 중 문제가 발생했습니다.");
    }
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
    const header = ["이름", "전화번호", "연령대", "거주지역", "보호자", "유입경로", "신청일", "기존참여횟수", "신청 회차", "상태"];
    const lines = rows.map((r) => [
      r.participant.name,
      r.participant.phone_number ?? `****-****-${r.participant.phone4}`,
      r.participant.age_group,
      (r.participant.residence_district ? `${r.participant.residence_district} ${r.participant.residence_dong ?? ""}` : r.participant.residence_area),
      r.participant.guardian_name ? `${r.participant.guardian_name} (${r.participant.guardian_phone})` : "",
      r.registration.acquisition_channel,
      new Date(r.registration.registered_at).toLocaleDateString("ko-KR"),
      String(r.priorVisits),
      r.sessionLabels,
      APPLICATION_STATUS_LABEL[r.registration.status],
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${program?.id ?? "program"}_신청자.csv`;
    link.click();
  };

  const downloadAttendanceCsv = () => {
    if (!attendanceData.length) { window.alert("출석 기록이 없습니다."); return; }

    const sessionMap: Record<string, { session_label: string; session_date: string }> = {};
    sessionsData.forEach((s) => (sessionMap[s.id] = s));

    const header = ["이름", "전화번호", "회차", "회차일자", "체크인 시각"];
    const lines = attendanceData.map((a) => {
      const p = rows.find((r) => r.participant.id === a.participant_id)?.participant;
      const s = sessionMap[a.session_id];
      return [
        p?.name ?? "",
        p?.phone_number ?? (p ? `****-****-${p.phone4}` : ""),
        s?.session_label ?? "",
        s?.session_date ?? "",
        new Date(a.checked_in_at).toLocaleString("ko-KR"),
      ];
    });
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${program?.id ?? "program"}_출석기록.csv`;
    link.click();
  };

  if (!program) return null;

  return (
    <div className="p-4 pb-16">
      <h1 className="font-display text-lg text-navy mb-1">{program.emoji} {program.title} · 신청자 관리</h1>
      <p className="text-xs text-muted mb-4">
        신청 {counts.total}명 · 선정 {counts.selected}명 · 대기 {counts.waitlisted}명 · 미선정 {counts.rejected}명
      </p>
      {error && <p className="text-xs text-coralDark mb-2">{error}</p>}

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
          <Download size={13} /> 신청자 CSV
        </button>
        <button onClick={downloadAttendanceCsv} className="flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg border border-line text-navy">
          <Download size={13} /> 출석기록 CSV
        </button>
      </div>

      <div className="rounded-xl border border-line overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 720 }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 132 }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 68 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead>
              <tr className="bg-sand text-navy sticky top-0 z-10">
                <th className="p-2.5 text-center align-middle">
                  <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filtered.length} onChange={toggleAll} />
                </th>
                <th className="text-left p-2.5 font-semibold tracking-tight">이름</th>
                <th className="text-left p-2.5 font-semibold tracking-tight">전화번호</th>
                <th className="text-left p-2.5 font-semibold tracking-tight">연령대</th>
                <th className="text-left p-2.5 font-semibold tracking-tight">거주지역</th>
                <th className="text-left p-2.5 font-semibold tracking-tight">유입경로</th>
                <th className="text-right p-2.5 font-semibold tracking-tight">기존참여</th>
                <th className="text-left p-2.5 font-semibold tracking-tight">신청 회차</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.registration.id}
                  className={`border-t border-line hover:bg-sandLight transition-colors ${selectedIds.has(r.registration.id) ? "bg-seafoamLight/40" : i % 2 === 1 ? "bg-sandLight/40" : ""}`}
                  style={{ boxShadow: `inset 3px 0 0 ${STATUS_STRIPE[r.registration.status]}` }}
                >
                  <td className="p-2.5 text-center align-middle">
                    <input type="checkbox" checked={selectedIds.has(r.registration.id)} onChange={() => toggleOne(r.registration.id)} />
                  </td>
                  <td className="p-2.5 align-middle whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <Pill tone={STATUS_TONE[r.registration.status]}>{APPLICATION_STATUS_LABEL[r.registration.status]}</Pill>
                      <span className="font-medium text-ink">{r.participant.name}</span>
                      {r.participant.guardian_name && (
                        <span className="text-[10px] text-coralDark">보호자 {r.participant.guardian_name} · {r.participant.guardian_phone}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 align-middle whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {r.participant.phone_number ?? `****-****-${r.participant.phone4}`}
                  </td>
                  <td className="p-2.5 align-middle text-muted whitespace-nowrap">{r.participant.age_group}</td>
                  <td className="p-2.5 align-middle text-muted whitespace-nowrap overflow-hidden text-ellipsis" title={r.participant.residence_district ? `${r.participant.residence_district} ${r.participant.residence_dong ?? ""}` : r.participant.residence_area}>
                    {r.participant.residence_district ? `${r.participant.residence_district} ${r.participant.residence_dong ?? ""}` : r.participant.residence_area}
                  </td>
                  <td className="p-2.5 align-middle text-muted whitespace-nowrap overflow-hidden text-ellipsis" title={r.registration.acquisition_channel}>
                    {r.registration.acquisition_channel}
                  </td>
                  <td className="p-2.5 align-middle text-right text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>{r.priorVisits}</td>
                  <td className="p-2.5 align-middle text-muted whitespace-nowrap overflow-hidden text-ellipsis" title={r.sessionLabels}>
                    {r.sessionLabels}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-xs text-muted p-4">해당하는 신청자가 없습니다.</p>}
      </div>

      {notifications.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Bell size={14} className="text-navy" />
            <span className="text-sm font-medium text-navy">알림 발송 기록</span>
          </div>
          <div className="rounded-xl border border-line bg-white divide-y divide-line">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-ink">{n.participant_name}</span>
                  <Pill tone={n.status === "sent" ? "seafoam" : "sand"}>{n.status === "sent" ? "발송됨" : "발송 대기(연동 전)"}</Pill>
                </div>
                <p className="text-muted">{n.message}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted px-1 mt-1.5">
            SMS 대행사 연동 전이라 실제 발송은 안 되고 기록만 남습니다. src/lib/waitlist.ts에서 연동할 수 있어요.
          </p>
        </div>
      )}
    </div>
  );
}
