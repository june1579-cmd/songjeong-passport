import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// MVP 단계: 브라우저에서 anon key로 직접 호출한다 (RLS로 최소 보호).
// 실서비스 전환 시 민감한 집계·관리자 조회는 Route Handler + service role로 옮길 것.
export const supabase = createClient(url, anonKey);
