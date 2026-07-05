import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "支援プログラムLab Marketplace",
  description: "福祉事業所向けプログラム教材の共有・販売プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
