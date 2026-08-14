// 서버 전용 관리자 인증 토큰 서명/검증.
// Web Crypto(subtle)를 사용해 Node/Edge 런타임 양쪽에서 동작하도록 작성.
// 비밀번호(ADMIN_PASSWORD)와 서명키(ADMIN_COOKIE_SECRET)는 절대 NEXT_PUBLIC_ 접두사를 붙이지 않는다 — 붙이면 브라우저 번들에 노출됨.

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function createAdminToken(secret: string): Promise<string> {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("songjeong-admin"));
  return toHex(sig);
}

export async function verifyAdminToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const expected = await createAdminToken(secret);
  // 길이가 같은지 먼저 확인 후 비교 (timing-safe에 가깝게)
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
