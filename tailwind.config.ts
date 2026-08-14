import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0D3B4E",       // Deep Ocean — 메인 브랜드
        navyLight: "#155067",
        sand: "#EFE3CB",       // Warm Sand — 배경 강조
        sandLight: "#FAF6EE",  // 배경
        coral: "#E8734A",      // Sunset — 강조/CTA
        coralDark: "#CC5A32",
        seafoam: "#3F9179",    // Sea Foam — 성공/참여
        seafoamLight: "#DFF0E8",
        amber: "#D98A1A",      // 마감임박 등 경고 톤
        amberLight: "#FBEBD2",
        ink: "#22303B",        // Slate — 본문 텍스트
        muted: "#5C6B74",
        line: "#E3DCC9",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
