import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest, { params }: { params: { programId: string } }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const programId = params.programId;
  const body = await req.json();
  const { program, newSessions, updatedSessions, removedSessionIds } = body as {
    program: Record<string, unknown>;
    newSessions?: { session_label: string; session_date: string; capacity: number | null }[];
    updatedSessions?: { id: string; session_label: string; session_date: string; capacity: number | null }[];
    removedSessionIds?: string[];
  };

  if (program) {
    const { error } = await admin.from("programs").update(program).eq("id", programId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (removedSessionIds?.length) {
    const { error } = await admin.from("sessions").delete().in("id", removedSessionIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (newSessions?.length) {
    const { error } = await admin.from("sessions").insert(newSessions.map((s) => ({ ...s, program_id: programId })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (updatedSessions?.length) {
    for (const s of updatedSessions) {
      const { error } = await admin
        .from("sessions")
        .update({ session_label: s.session_label, session_date: s.session_date, capacity: s.capacity })
        .eq("id", s.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { programId: string } }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("programs").delete().eq("id", params.programId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
