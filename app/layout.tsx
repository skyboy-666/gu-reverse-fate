import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "蛊界：逆命 · 月兰田疑云",
  description: "一款关于情报、炼蛊与抉择的竖屏策略养成 RPG 原型。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
