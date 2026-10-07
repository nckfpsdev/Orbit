import { LeadDetail } from "@/components/orbit/lead-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadDetail businessId={id} />;
}
