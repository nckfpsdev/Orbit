import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const client = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const result = code ? await client.auth.exchangeCodeForSession(code)
    : tokenHash && type && ["signup","email","recovery","invite"].includes(type)
      ? await client.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      : { error: new Error("INVALID_CONFIRMATION") };
  return NextResponse.redirect(new URL(result.error ? "/login?confirmation=failed" : "/", url.origin));
}
