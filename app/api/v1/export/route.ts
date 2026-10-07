import { z } from "zod";
import {
  context,
  checkMutation,
  errorResponse,
  AppError,
  audit,
  rateLimit,
} from "@/lib/server/security";
import { readJson } from "@/lib/server/request-body";
import { getBusinessesByIds } from "@/lib/server/store";
import { csvExport, xlsxExport } from "@/lib/domain/export";
import { EXPORT_FIELDS } from "@/lib/domain/constants";
export async function POST(request: Request) {
  try {
    checkMutation(request);
    const c = await context();
    await rateLimit(`${c.orgId}:export`, 8, 60);
    const input = z
      .object({
        ids: z.array(z.string().max(120)).min(1).max(250),
        fields: z.array(z.enum(EXPORT_FIELDS)).min(1).max(EXPORT_FIELDS.length),
        format: z.enum(["csv", "xlsx"]),
      })
      .strict()
      .parse(await readJson(request));
    const businesses = await getBusinessesByIds(c, input.ids);
    if (businesses.some((b) => !b.can_export))
      throw new AppError(
        "EXPORT_RESTRICTED",
        "A fonte de um dos leads não permite exportação.",
        403,
      );
    await audit(
      c,
      "leads.export",
      null,
      `${input.format} · ${businesses.length} registros`,
    );
    const data =
      input.format === "csv"
        ? csvExport(businesses, input.fields)
        : new Uint8Array(xlsxExport(businesses, input.fields)).buffer;
    return new Response(data, {
      headers: {
        "Content-Type":
          input.format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="orbit-leads.${input.format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
