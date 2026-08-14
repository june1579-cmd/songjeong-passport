// MVP용 간편 식별: 로그인 없이 localStorage에 참여자 id만 저장한다.
// 실서비스 전환 시 Supabase Auth(전화번호 OTP 등)로 교체 권장.
const KEY = "sjpassport:participantId";

export function getStoredParticipantId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setStoredParticipantId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
}

export function clearStoredParticipantId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
