import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "支援プログラムLab",
  description: "自分とチームのプログラムを保管し、必要な人に共有できる教材保管庫",
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
