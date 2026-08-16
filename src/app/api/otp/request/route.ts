import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 휴대폰 인증번호 발송. 알리고(Aligo) 연동 정보(ALIGO_API_KEY 등)가 서버 환경변수에
// 설정되어 있으면 실제 SMS로 발송하고, 없으면 데모 모드로 코드를 응답에 함께 돌려준다.
// (API 키는 서버에서만 쓰이므로 브라우저에는 절대 노출되지 않는다.)

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  const { phoneNumber } = await req.json();
  if (!phoneNumber || String(phoneNumber).length < 10) {
    return NextResponse.json({ error: "휴대폰 번호를 정확히 입력해주세요." }, { status: 400 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: dbErr } = await supabase.from("phone_verifications").insert({
    phone_number: phoneNumber,
    code,
    expires_at: expiresAt,
  });
  if (dbErr) return NextResponse.json({ error: "인증번호 발송에 실패했습니다. 다시 시도해주세요." }, { status: 500 });

  const aligoKey = process.env.ALIGO_API_KEY;
  const aligoUserId = process.env.ALIGO_USER_ID;
  const aligoSender = process.env.ALIGO_SENDER;

  // 알리고 연동 정보가 아직 없으면 데모 모드 — 화면에 인증번호를 같이 보여준다.
  if (!aligoKey || !aligoUserId || !aligoSender) {
    return NextResponse.json({ demoMode: true, code });
  }

  // 연동 정보가 있으면 실제 SMS 발송
  try {
    const body = new URLSearchParams({
      key: aligoKey,
      user_id: aligoUserId,
      sender: aligoSender,
      receiver: String(phoneNumber),
      msg: `[Experience Passport] 인증번호는 ${code}입니다. 5분 이내에 입력해주세요.`,
    });
    const res = await fetch("https://apis.aligo.in/send/", { method: "POST", body });
    const data = await res.json();
    if (String(data.result_code) !== "1") {
      console.error("Aligo SMS 발송 실패:", data);
      return NextResponse.json({ error: "문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
  } catch (e) {
    console.error("Aligo SMS 요청 오류:", e);
    return NextResponse.json({ error: "문자 발송 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ demoMode: false });
}
