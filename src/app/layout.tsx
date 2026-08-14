import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "송정 패스포트",
  description: "송정에서 배우고, 경험하고, 기록하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-body">
        <div className="max-w-[480px] mx-auto relative shadow-[0_0_40px_rgba(0,0,0,0.06)] min-h-screen bg-sandLight">
          {children}
        </div>
      </body>
    </html>
  );
}
