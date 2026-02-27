import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TODO Dashboard",
  description: "タスク管理ダッシュボード",
  other: {
    "mobile-web-app-capable": "yes",
  },
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