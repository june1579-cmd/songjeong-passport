import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.passup.kr"),
  title: "PassUp",
  description: "One passport, every experience. 지역과 프로그램을 넘어, 하나로 이어지는 나의 경험.",
  openGraph: {
    title: "PassUp",
    description: "One passport, every experience. 지역과 프로그램을 넘어, 하나로 이어지는 나의 경험.",
    siteName: "PassUp",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PassUp",
    description: "One passport, every experience.",
  },
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
