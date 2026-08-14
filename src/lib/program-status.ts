import { Program, Registration, Session, Attendance } from "./types";

export type CardStatus = "upcoming" | "open" | "almost_full" | "full" | "registered" | "completed" | "cancelled" | "closed";

export const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  upcoming: "모집예정",
  open: "신청가능",
  almost_full: "마감임박",
  full: "신청마감",
  registered: "신청완료",
  completed: "참여완료",
  cancelled: "취소됨",
  closed: "종료된 프로그램",
};

export const CARD_STATUS_TONE: Record<CardStatus, "sand" | "seafoam" | "coral" | "amber" | "navy"> = {
  upcoming: "sand",
  open: "seafoam",
  almost_full: "amber",
  full: "sand",
  registered: "navy",
  completed: "seafoam",
  cancelled: "sand",
  closed: "sand",
};

// 프로그램 하나의 상태를 여러 신호(program_status, 정원, 내 신청/출석 여부)로부터 계산한다.
export function computeCardStatus(
  program: Program,
  totalCapacity: number | null, // 전체 회차 정원 합 (없으면 null=무제한)
  totalRegistrations: number,
  myRegistration: Registration | null | undefined,
  myAttendanceCount: number
): CardStatus {
  if (program.program_status === "cancelled") return "cancelled";
  if (program.program_status === "completed") return myAttendanceCount > 0 ? "completed" : "closed";
  if (program.program_status === "draft" || program.program_status === "scheduled") return "upcoming";

  if (myRegistration) {
    if (myRegistration.status === "cancelled" || myRegistration.status === "rejected") {
      // 취소/미선정이어도 다른 회차는 열려있을 수 있으니 정원 기준으로 폴백
    } else if (myAttendanceCount > 0 && program.program_status !== "recruiting") {
      return "completed";
    } else {
      return "registered";
    }
  }

  if (program.program_status === "closed" || program.program_status === "in_progress") {
    return totalCapacity !== null && totalRegistrations >= totalCapacity ? "full" : "closed";
  }

  // recruiting
  if (totalCapacity !== null) {
    const remaining = totalCapacity - totalRegistrations;
    if (remaining <= 0) return "full";
    if (remaining <= Math.max(2, Math.ceil(totalCapacity * 0.15))) return "almost_full";
  }
  return "open";
}

export function remainingSpots(totalCapacity: number | null, totalRegistrations: number): number | null {
  if (totalCapacity === null) return null;
  return Math.max(totalCapacity - totalRegistrations, 0);
}

export function nextUpcomingSession(sessions: Session[], attendance: Attendance[]): Session | null {
  const today = new Date().toISOString().slice(0, 10);
  const attended = new Set(attendance.map((a) => a.session_id));
  const upcoming = sessions
    .filter((s) => s.session_date >= today && !attended.has(s.id))
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  return upcoming[0] ?? null;
}
