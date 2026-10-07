export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_ENV_NOT_CONFIGURED");
  if (new URL(url).protocol !== "https:")
    throw new Error("SUPABASE_URL_INVALID");
  return { url, key };
}
