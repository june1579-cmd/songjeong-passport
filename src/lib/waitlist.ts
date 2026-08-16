import { supabase } from "./supabase";
import { Registration } from "./types";

// 선정자가 취소/미선정으로 바뀌어 자리가 비면, 가장 먼저 신청한 대기자를 자동으로 선정 처리하고
// 문자(SMS) 발송 기록을 남긴다(실제 발송 연동 전까지는 notifications 테이블에 pending으로 기록만 됨 —
// SMS 대행사(솔라피, 알리고, NHN Cloud 등) 가입 후 이 함수의 마지막 insert 부분만 실제 발송 API 호출로 교체하면 된다.
// 휴대폰 인증번호 발송(src/lib/otp.ts)과 같은 대행사 계정을 그대로 재사용할 수 있다).
export async function promoteNextWaitlisted(programId: string, freedRegistrationStatus: string) {
  if (freedRegistrationStatus !== "cancelled" && freedRegistrationStatus !== "rejected") return;

  const { data: nextInLine } = await supabase
    .from("registrations")
    .select("*")
    .eq("program_id", programId)
    .eq("status", "waitlisted")
    .order("registered_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextInLine) return;

  await supabase.from("registrations").update({ status: "selected" }).eq("id", (nextInLine as Registration).id);

  const { data: participant } = await supabase.from("participants").select("name, phone_number").eq("id", (nextInLine as Registration).participant_id).single();
  const { data: program } = await supabase.from("programs").select("title").eq("id", programId).single();

  await supabase.from("notifications").insert({
    participant_id: (nextInLine as Registration).participant_id,
    program_id: programId,
    channel: "sms",
    message: `[Experience Passport] ${participant?.name ?? ""}님, '${program?.title ?? ""}' 프로그램에 자리가 생겨 선정되셨습니다. 참여를 원하시면 사이트에서 확인해주세요.`,
    status: "pending",
  });
}
