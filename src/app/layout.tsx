import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DraftMind",
  description: "AI-powered writing assistant — 基于第一性原理的智能写作辅助工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
