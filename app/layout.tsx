import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gu-reverse-fate-moonfield.jazzy-crumb-9032.chatgpt.site"),
  title: "蛊界：逆命 · 月兰蛊坊经营模拟",
  description: "十二旬内经营月兰田、派遣人员、炼蛊交易并左右三方势力。",
  openGraph: {
    title: "蛊界：逆命 · 月兰蛊坊经营模拟",
    description: "十二旬，一盘生意与命局。经营产业、派遣人员、炼蛊交易并左右三方势力。",
    images: [{ url: "/og.png", width: 1728, height: 928, alt: "蛊界：逆命 · 月兰蛊坊经营模拟" }],
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "蛊界：逆命 · 月兰蛊坊经营模拟",
    description: "十二旬，一盘生意与命局。",
    images: ["/og.png"],
  },
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
