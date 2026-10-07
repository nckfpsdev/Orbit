import { Admin } from "@/components/orbit/admin";
import { notFound } from "next/navigation";
import { context, isAdmin } from "@/lib/server/security";
export default async function Page() {
  if (!isAdmin(await context())) notFound();
  return <Admin />;
}
