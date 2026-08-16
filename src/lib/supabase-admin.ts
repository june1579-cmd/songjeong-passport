import { createClient } from "@supabase/supabase-js";

// 서버 전용 관리자 클라이언트 — Service Role Key로 RLS를 우회한다.
// 절대 클라이언트 컴포넌트나 브라우저에 노출되면 안 된다. API Route Handler에서만 import할 것.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 서버 환경변수에 설정되어 있지 않습니다.");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}
