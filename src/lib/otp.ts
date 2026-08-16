import { supabase } from "./supabase";

// 휴대폰 인증(OTP). 실제 발송은 /api/otp/request 서버 라우트에서 처리한다
// (알리고 API Key는 서버 환경변수로만 존재 — 브라우저에 노출되지 않는다).
// 아직 알리고 연동 정보가 없으면 자동으로 데모 모드로 동작한다(화면에 인증번호 표시).

export async function requestVerificationCode(phoneNumber: string): Promise<{ code?: string; demoMode: boolean } | { error: string }> {
  try {
    const res = await fetch("/api/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "인증번호 발송에 실패했습니다." };
    return data;
  } catch {
    return { error: "인증번호 발송 중 오류가 발생했습니다." };
  }
}

export async function verifyCode(phoneNumber: string, code: string): Promise<boolean> {
  const { data } = await supabase
    .from("phone_verifications")
    .select("*")
    .eq("phone_number", phoneNumber)
    .eq("code", code)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  await supabase.from("phone_verifications").update({ verified: true }).eq("id", data.id);
  return true;
}
