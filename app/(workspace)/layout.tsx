import { getIdentity } from "@/lib/supabase/auth";
import { row } from "@/lib/server/db";
import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/orbit/providers";
import { Shell } from "@/components/orbit/shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getIdentity())) redirect("/login");
  const session = await row<{ valid: boolean }>("SELECT private.session_valid() AS valid");
  if (!session?.valid) redirect("/login");
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
