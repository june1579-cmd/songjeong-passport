import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();

  const [{ data: programs }, { data: registrations }, { data: attendance }, { data: surveys }, { data: participants }] = await Promise.all([
    admin.from("programs").select("*").order("created_at"),
    admin.from("registrations").select("*"),
    admin.from("attendance").select("*"),
    admin.from("surveys").select("*"),
    admin.from("participants").select("id"),
  ]);

  return NextResponse.json({
    programs: programs ?? [],
    registrations: registrations ?? [],
    attendance: attendance ?? [],
    surveys: surveys ?? [],
    participantsCount: participants?.length ?? 0,
  });
}
