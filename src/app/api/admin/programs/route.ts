import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const body = await req.json();
  const { program, sessions } = body as {
    program: Record<string, unknown> & { id: string };
    sessions?: { session_label: string; session_date: string; capacity: number | null }[];
  };

  const { error: insertErr } = await admin.from("programs").insert(program);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: insertErr.message.includes("duplicate") ? 409 : 500 });

  if (sessions?.length) {
    const { error: sessErr } = await admin.from("sessions").insert(sessions.map((s) => ({ ...s, program_id: program.id })));
    if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
