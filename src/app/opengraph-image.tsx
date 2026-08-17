import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PassUp — One passport, every experience.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(150deg, #0D3B4E 0%, #2E8FC0 40%, #3F9179 75%, #9C6FCB 130%)",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              border: "4px solid #FAF6EE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 999, border: "4px solid #E8734A" }} />
          </div>
          <div style={{ color: "#FAF6EE", fontSize: 40, fontWeight: 700 }}>PassUp</div>
        </div>
        <div style={{ color: "#FFFFFF", fontSize: 58, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>
          오늘의 경험이 다음으로 이어져요
        </div>
        <div style={{ color: "#FAF6EEcc", fontSize: 28, marginTop: 24, textAlign: "center" }}>
          One passport, every experience.
        </div>
      </div>
    ),
    { ...size }
  );
}
