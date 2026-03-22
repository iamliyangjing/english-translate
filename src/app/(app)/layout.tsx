import type { Metadata } from "next";
import AppNavbar from "@/components/AppNavbar";

export const metadata: Metadata = {
  title: "应用",
  description: "LinguaCards 翻译工作台与学习工具。",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppNavbar />
      {children}
    </>
  );
}
