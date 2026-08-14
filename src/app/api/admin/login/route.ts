import { NextRequest, NextResponse } from "next/server";
import { createAdminToken } from "@/lib/admin-token";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "서버에 ADMIN_PASSWORD가 설정되어 있지 않습니다." }, { status: 500 });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const secret = process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSWORD;
  const token = await createAdminToken(secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8시간 유지
  });
  return res;
}
