import type { Metadata } from "next";
import AppNavbar from "@/components/AppNavbar";

export const metadata: Metadata = {
  title: "Workspace",
  description: "LinguaCards translation workspace and study tools.",
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppNavbar />
      {children}
    </>
  );
}
