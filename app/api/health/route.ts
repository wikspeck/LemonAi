import { getCloudflareContext } from "@opennextjs/cloudflare";
export async function GET() {
  try { const { env } = await getCloudflareContext({ async: true }); const available = Boolean(env.AI); return Response.json({ version: "2.1.0", status: available ? "ready" : "unavailable" }, { status: available ? 200 : 503, headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ version: "2.1.0", status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
