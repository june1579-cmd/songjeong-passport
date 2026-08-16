import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { promoteNextWaitlisted } from "@/lib/waitlist";
import { ApplicationStatus, Attendance } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: { programId: string } }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const programId = params.programId;

  const { data: regs } = await admin.from("registrations").select("*").eq("program_id", programId).order("registered_at");
  const participantIds = (regs ?? []).map((r) => r.participant_id);

  let participants: any[] = [];
  let priorVisitsMap: Record<string, number> = {};
  if (participantIds.length) {
    const { data: p } = await admin.from("participants").select("*").in("id", participantIds);
    participants = p ?? [];
    const { data: allAttendance } = await admin.from("attendance").select("participant_id, program_id").in("participant_id", participantIds);
    const progSets: Record<string, Set<string>> = {};
    (allAttendance as Attendance[] ?? []).forEach((a) => {
      progSets[a.participant_id] = progSets[a.participant_id] ?? new Set();
      progSets[a.participant_id].add(a.program_id);
    });
    Object.entries(progSets).forEach(([pid, set]) => (priorVisitsMap[pid] = set.size));
  }

  const { data: notifs } = await admin.from("notifications").select("*").eq("program_id", programId).order("created_at", { ascending: false }).limit(10);
  let notifications: any[] = [];
  if (notifs?.length) {
    const { data: p2 } = await admin.from("participants").select("id,name").in("id", notifs.map((n) => n.participant_id));
    notifications = notifs.map((n) => ({ ...n, participant_name: p2?.find((p) => p.id === n.participant_id)?.name ?? "" }));
  }

  return NextResponse.json({ registrations: regs ?? [], participants, priorVisitsMap, notifications });
}

export async function PATCH(req: NextRequest, { params }: { params: { programId: string } }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const programId = params.programId;
  const body = await req.json();
  const { registrationIds, status } = body as { registrationIds: string[]; status: ApplicationStatus };
  if (!registrationIds?.length || !status) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  // 취소/미선정으로 바뀌는 대상 중 원래 '선정' 상태였던 건만 대기자 승격 대상
  let freedCount = 0;
  if (status === "cancelled" || status === "rejected") {
    const { data: before } = await admin.from("registrations").select("id, status").in("id", registrationIds);
    freedCount = (before ?? []).filter((r) => r.status === "selected").length;
  }

  const { error } = await admin.from("registrations").update({ status }).in("id", registrationIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (let i = 0; i < freedCount; i++) {
    await promoteNextWaitlisted(admin, programId, status);
  }

  return NextResponse.json({ ok: true });
}
