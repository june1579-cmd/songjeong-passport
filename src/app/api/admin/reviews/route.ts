import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: reviews, error } = await admin.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: programs } = await admin.from("programs").select("id, emoji, title");
  const programMap = new Map((programs ?? []).map((p) => [p.id, p]));
  const enriched = (reviews ?? []).map((r) => ({ ...r, program: programMap.get(r.program_id) ?? null }));
  return NextResponse.json({ reviews: enriched });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { id, patch } = await req.json();
  if (!id || !patch) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { error } = await admin.from("reviews").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { error } = await admin.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
