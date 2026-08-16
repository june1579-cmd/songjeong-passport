import { NextRequest } from "next/server";
import { verifyAdminToken } from "./admin-token";

// API Route Handler 안에서 관리자 쿠키를 검증하는 헬퍼.
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_auth")?.value;
  const secret = process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSWORD || "";
  if (!secret) return false;
  return verifyAdminToken(token, secret);
}
