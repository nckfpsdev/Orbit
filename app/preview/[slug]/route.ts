import { businessVisibility } from "@/lib/server/environment";
import { row, runtime } from "@/lib/server/db";
import { buildSiteHtml } from "@/lib/domain/site-html";
import type { WebsiteContent } from "@/lib/domain/types";
import { errorResponse } from "@/lib/server/security";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const site = await row<{ content_json: string; data_json: string }>(
      `SELECT w.content_json,b.data_json FROM generated_websites w JOIN businesses b ON b.id=w.business_id AND b.organization_id=w.organization_id WHERE w.slug=? AND w.status='published' AND ${businessVisibility()}`,
      slug,
    );
    if (!site)
      return new Response(
        "Demonstração não encontrada ou ainda não publicada.",
        {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    const business = JSON.parse(site.data_json);
    const html = buildSiteHtml(
      JSON.parse(site.content_json) as WebsiteContent,
      { isFictional: business.is_demo, origin: runtime().APP_ORIGIN, slug },
    );
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; script-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
