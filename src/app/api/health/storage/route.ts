import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabase();
  return NextResponse.json({
    storage: supabase ? "supabase" : "sqlite",
  });
}
