import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import type { Database } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";

type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async signIn({ user, account }) {
      const supabase = getSupabase();
      if (!supabase || !account?.provider || !account.providerAccountId) {
        return true;
      }

      const id = `${account.provider}:${account.providerAccountId}`;
      const now = new Date().toISOString();
      const payload: UserInsert = {
        id,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        email: user.email ?? null,
        name: user.name ?? null,
        image: user.image ?? null,
        updated_at: now,
        last_login_at: now,
      };

      const { error } = await supabase.from("users").upsert(payload, {
        onConflict: "id",
      });

      if (error) {
        console.error("Supabase user upsert failed", error.message);
        return true;
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        const provider = (token.provider as string | undefined) ?? "oauth";
        const providerAccountId =
          (token.providerAccountId as string | undefined) ??
          token.sub ??
          token.email ??
          "";
        session.user.id = providerAccountId
          ? `${provider}:${providerAccountId}`
          : "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};
