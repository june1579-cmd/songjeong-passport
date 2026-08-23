import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// 관리자가 QR 스캔 없이 직접 출석을 기록하거나 취소하는 API.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { participantId, programId, sessionId } = await req.json();
  if (!participantId || !programId || !sessionId) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { error } = await admin
    .from("attendance")
    .insert({ participant_id: participantId, program_id: programId, session_id: sessionId })
    .select()
    .maybeSingle();

  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("stamps").insert({ participant_id: participantId, program_id: programId, session_id: sessionId }).select().maybeSingle();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { participantId, sessionId } = await req.json();
  if (!participantId || !sessionId) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { error } = await admin.from("attendance").delete().eq("participant_id", participantId).eq("session_id", sessionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("stamps").delete().eq("participant_id", participantId).eq("session_id", sessionId);

  return NextResponse.json({ ok: true });
}
