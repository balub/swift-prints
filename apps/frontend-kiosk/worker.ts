export default {
  /**
   * Cloudflare Worker entrypoint for SPA routing.
   *
   * - Tries to serve static assets from the `ASSETS` binding first.
   * - If the asset fetch returns 404 and the path looks like a SPA route
   *   (no file extension), it falls back to serving `/index.html`.
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // First, try to serve the static asset directly.
    const assetResponse = await env.ASSETS.fetch(request);

    // If the asset exists, return it as-is.
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // If the request looks like a direct file request (has a dot in the last path segment),
    // just return the original 404.
    const lastSegment = url.pathname.split("/").pop() ?? "";
    if (lastSegment.includes(".")) {
      return assetResponse;
    }

    // For SPA routes (e.g. /admin/login, /dashboard, etc.), serve the root index.html.
    const rootUrl = new URL("/", request.url);
    return env.ASSETS.fetch(new Request(rootUrl.toString(), request));
  },
} satisfies ExportedHandler<Env>;

interface Env {
  ASSETS: Fetcher;
}
