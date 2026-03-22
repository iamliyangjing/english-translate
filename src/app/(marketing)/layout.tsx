import type { Metadata } from "next";
import LandingNavbar from "@/components/LandingNavbar";

export const metadata: Metadata = {
  title: "LinguaCards",
  description: "把翻译变成可复习的卡片，让英语学习更有节奏感。",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LandingNavbar />
      {children}
    </>
  );
}
