import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "./server";

export const getIdentity = cache(async () => {
  const client = await createClient();
  const authorization = (await headers()).get("authorization");
  const jwt = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const { data, error } = await client.auth.getClaims(jwt);
  if (error || !data?.claims) return null;
  const claims = data.claims;
  if (typeof claims.sub !== "string" || typeof claims.session_id !== "string" || typeof claims.email !== "string") return null;
  const metadata = claims.user_metadata as Record<string, unknown> | undefined;
  return { claims, id: claims.sub, email: claims.email, name: typeof metadata?.full_name === "string" ? metadata.full_name.slice(0,180) : claims.email.split("@")[0] };
});
