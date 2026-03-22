"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </SessionProvider>
  );
}
