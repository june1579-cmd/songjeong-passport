// 카테고리별 컬러 팔레트 — 프로그램 카테고리를 다채롭게 표현하기 위한 색상 매핑.
// 접근성을 위해 배경은 연하게, 텍스트는 충분한 명도 대비를 유지한다.
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; solid: string }> = {
  "스포츠": { bg: "#DCEEFB", text: "#1B6FA8", solid: "#2E8FC0" },
  "환경": { bg: "#DFF0E8", text: "#3F9179", solid: "#3F9179" },
  "미술": { bg: "#F3E3FB", text: "#8B5CB0", solid: "#9C6FCB" },
  "공예": { bg: "#FBEBD2", text: "#B9761F", solid: "#D98A1A" },
  "문화": { bg: "#FCE1E7", text: "#C24463", solid: "#DD5C7B" },
  "지역활동": { bg: "#EFE3CB", text: "#8A6A2E", solid: "#B98F3E" },
  "가족": { bg: "#FDE7D8", text: "#C96A2E", solid: "#E8834A" },
  "기타": { bg: "#E7E7EC", text: "#5A5A66", solid: "#8A8A99" },
};

export function categoryColor(category: string | null | undefined) {
  return CATEGORY_COLORS[category ?? ""] ?? CATEGORY_COLORS["기타"];
}

// 스탬프/포인트에 쓰는 순환 팔레트 (카테고리 무관하게 알록달록하게)
export const STAMP_PALETTE = ["#2E8FC0", "#3F9179", "#9C6FCB", "#D98A1A", "#DD5C7B", "#E8834A"];
