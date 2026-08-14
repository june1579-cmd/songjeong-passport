import { supabase } from "./supabase";

// MVP 데모용 휴대폰 인증(OTP).
// 실제 SMS 발송 연동 전이므로 인증번호를 화면에 함께 보여준다 (프로덕션에서는 절대 노출 금지).
// 실서비스 전환 시 이 파일만 SMS 프로바이더(NHN Cloud, Solapi 등) 연동으로 교체하면 된다.

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestVerificationCode(phoneNumber: string): Promise<{ code: string } | { error: string }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await supabase.from("phone_verifications").insert({
    phone_number: phoneNumber,
    code,
    expires_at: expiresAt,
  });
  if (error) return { error: "인증번호 발송에 실패했습니다. 다시 시도해주세요." };
  return { code }; // 데모 표시용. 실서비스에서는 반환하지 않고 SMS로만 전달한다.
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
