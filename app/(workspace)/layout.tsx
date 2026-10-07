import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { WorkspaceProvider } from "@/components/orbit/providers";
import { Shell } from "@/components/orbit/shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") await requireChatGPTUser("/");
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
