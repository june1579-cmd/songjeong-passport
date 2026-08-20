// URL 확장자로 영상인지 사진인지 구분한다 (DB 스키마 변경 없이 간단하게 처리).
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v|ogg)(\?|$)/i.test(url);
}
