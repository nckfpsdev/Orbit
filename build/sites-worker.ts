import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async fetch(
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>,
  ) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt)
            return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return {
              status: "request_context_expired",
              message: "This request has expired. Please try again.",
            };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const requestId = crypto.randomUUID();
    const started = Date.now();
    const response = await runWithConnectorBinding(binding, () =>
      handler.fetch(request, env, ctx),
    );
    const secured = new Response(response.body, response);
    secured.headers.set("X-Request-Id", requestId);
    secured.headers.set("X-Content-Type-Options", "nosniff");
    secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    secured.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    secured.headers.set("X-Robots-Tag", "noindex, nofollow");
    if (!secured.headers.has("Content-Security-Policy"))
      secured.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'" +
          (import.meta.env.DEV ? " 'unsafe-eval'" : "") +
          "; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' data:; connect-src 'self'" +
          (import.meta.env.DEV ? " ws: wss:" : "") +
          "; frame-src 'self' blob:; frame-ancestors 'self' https://chatgpt.com; object-src 'none'; base-uri 'self' about:; form-action 'self'",
      );
    if (new URL(request.url).protocol === "https:")
      secured.headers.set("Strict-Transport-Security", "max-age=31536000");
    if (response.status >= 500 || Date.now() - started > 1000)
      console.error(
        JSON.stringify({
          event: "request_completed",
          request_id: requestId,
          method: request.method,
          route: new URL(request.url).pathname.split("/").slice(0, 4).join("/"),
          status: response.status,
          duration_ms: Date.now() - started,
        }),
      );
    return secured;
  },
};
