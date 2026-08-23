import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// 노쇼 처리 시 자동으로 블랙리스트 지정되는 기준 횟수
const AUTO_BLACKLIST_THRESHOLD = 2;

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { participantId, programId, sessionId } = await req.json();
  if (!participantId || !programId) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { error: insertErr } = await admin.from("no_shows").insert({ participant_id: participantId, program_id: programId, session_id: sessionId ?? null });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { data: participant } = await admin.from("participants").select("no_show_count").eq("id", participantId).single();
  const newCount = (participant?.no_show_count ?? 0) + 1;
  const patch: Record<string, unknown> = { no_show_count: newCount };
  if (newCount >= AUTO_BLACKLIST_THRESHOLD) patch.is_blacklisted = true;

  const { error: updErr } = await admin.from("participants").update(patch).eq("id", participantId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, noShowCount: newCount, autoBlacklisted: newCount >= AUTO_BLACKLIST_THRESHOLD });
}
