import { batch } from "./db";
import { audit, type Context } from "./security";
export async function deleteCommercialData(c: Context) {
  const statements = [
    {
      sql: "DELETE FROM lead_tag_links WHERE lead_id IN (SELECT id FROM leads WHERE organization_id=?)",
      args: [c.orgId],
    },
    {
      sql: "DELETE FROM search_results WHERE search_id IN (SELECT id FROM searches WHERE organization_id=?)",
      args: [c.orgId],
    },
  ];
  for (const table of [
    "website_versions",
    "proposals",
    "sales_scripts",
    "generated_websites",
    "crm_activities",
    "leads",
    "lead_tags",
    "lead_lists",
    "website_analyses",
    "digital_presences",
    "business_sources",
    "businesses",
    "locations",
    "searches",
    "monitors",
    "jobs",
    "caches",
    "api_operations",
  ])
    statements.push({
      sql: `DELETE FROM ${table} WHERE organization_id=?`,
      args: [c.orgId],
    });
  statements.push({
    sql: "UPDATE organizations SET initialized=1 WHERE id=?",
    args: [c.orgId],
  });
  await batch(statements);
  await audit(
    c,
    "workspace.commercial_data_deleted",
    c.orgId,
    "Dados comerciais excluídos pelo proprietário",
  );
  return { deleted: true };
}
