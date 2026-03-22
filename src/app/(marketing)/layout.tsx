import type { Metadata } from "next";
import LandingNavbar from "@/components/LandingNavbar";

export const metadata: Metadata = {
  title: "LinguaCards",
  description: "Turn translation into reviewable cards and build a calmer study rhythm.",
};

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <LandingNavbar />
      {children}
    </>
  );
}
