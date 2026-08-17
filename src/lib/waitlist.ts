import { SupabaseClient } from "@supabase/supabase-js";
import { Registration } from "./types";

// 선정자가 취소/미선정으로 바뀌어 자리가 비면, 가장 먼저 신청한 대기자를 자동으로 선정 처리하고
// 문자(SMS)로 알림을 보낸다. 알리고(Aligo) 연동 정보(ALIGO_API_KEY 등)가 서버 환경변수에
// 설정되어 있으면 실제로 발송하고, 없으면 notifications 테이블에 pending으로 기록만 남긴다.
// 서버(API Route)에서 서비스 롤 클라이언트로 호출한다 — 참여자 개인정보를 다루기 때문.
export async function promoteNextWaitlisted(client: SupabaseClient, programId: string, freedRegistrationStatus: string) {
  if (freedRegistrationStatus !== "cancelled" && freedRegistrationStatus !== "rejected") return;

  const { data: nextInLine } = await client
    .from("registrations")
    .select("*")
    .eq("program_id", programId)
    .eq("status", "waitlisted")
    .order("registered_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextInLine) return;

  await client.from("registrations").update({ status: "selected" }).eq("id", (nextInLine as Registration).id);

  const { data: participant } = await client.from("participants").select("name, phone_number").eq("id", (nextInLine as Registration).participant_id).single();
  const { data: program } = await client.from("programs").select("title").eq("id", programId).single();

  const message = `[PassUp] ${participant?.name ?? ""}님, '${program?.title ?? ""}' 프로그램에 자리가 생겨 선정되셨습니다. 참여를 원하시면 사이트에서 확인해주세요.`;

  const aligoKey = process.env.ALIGO_API_KEY;
  const aligoUserId = process.env.ALIGO_USER_ID;
  const aligoSender = process.env.ALIGO_SENDER;
  let status: "pending" | "sent" | "failed" = "pending";

  if (aligoKey && aligoUserId && aligoSender && participant?.phone_number) {
    try {
      const body = new URLSearchParams({
        key: aligoKey,
        user_id: aligoUserId,
        sender: aligoSender,
        receiver: participant.phone_number,
        msg: message,
      });
      const res = await fetch("https://apis.aligo.in/send/", { method: "POST", body });
      const data = await res.json();
      status = String(data.result_code) === "1" ? "sent" : "failed";
      if (status === "failed") console.error("Aligo SMS 발송 실패 (대기자 알림):", data);
    } catch (e) {
      status = "failed";
      console.error("Aligo SMS 요청 오류 (대기자 알림):", e);
    }
  }

  await client.from("notifications").insert({
    participant_id: (nextInLine as Registration).participant_id,
    program_id: programId,
    channel: "sms",
    message,
    status,
  });
}
