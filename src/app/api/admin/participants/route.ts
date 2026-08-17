import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: participants, error } = await admin.from("participants").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 참여자별 신청 프로그램 목록을 함께 붙여서 반환 (참여자 관리 화면에서 "누가 뭘 참여했는지" 보여주기 위함)
  const { data: regs } = await admin.from("registrations").select("participant_id, program_id, status");
  const { data: programs } = await admin.from("programs").select("id, emoji, title");
  const programMap = new Map((programs ?? []).map((p) => [p.id, p]));
  const programsByParticipant = new Map<string, { id: string; emoji: string | null; title: string; status: string }[]>();
  (regs ?? []).forEach((r) => {
    const prog = programMap.get(r.program_id);
    if (!prog) return;
    const list = programsByParticipant.get(r.participant_id) ?? [];
    list.push({ id: prog.id, emoji: prog.emoji, title: prog.title, status: r.status });
    programsByParticipant.set(r.participant_id, list);
  });

  const enriched = (participants ?? []).map((p) => ({ ...p, programs: programsByParticipant.get(p.id) ?? [] }));
  return NextResponse.json({ participants: enriched });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, patch } = body as { id: string; patch: Record<string, unknown> };
  if (!id || !patch) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("participants").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { ids } = body as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("participants").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
