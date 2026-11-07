import { getCloudflareContext } from "@opennextjs/cloudflare";
import release from "@/public/downloads/android-release.json";

export async function GET(request: Request) {
  if (!release.published || !release.parts.length || !release.testedAt) return new Response("Android release is not published", { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const assets = env.ASSETS;
  if (!assets) return new Response("Download storage unavailable", { status: 503 });
  let index = 0; let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          if (!reader) {
            if (index >= release.parts.length) { controller.close(); return; }
            const part = await assets.fetch(new Request(new URL(release.parts[index++], request.url)));
            if (!part.ok || !part.body) throw new Error("Download segment unavailable");
            reader = part.body.getReader();
          }
          const chunk = await reader.read();
          if (chunk.done) { reader.releaseLock(); reader = undefined; continue; }
          controller.enqueue(chunk.value); return;
        }
      } catch (error) { controller.error(error); }
    },
    async cancel() { await reader?.cancel(); },
  });
  return new Response(body, { headers: { "Content-Type": "application/vnd.android.package-archive", "Content-Disposition": `attachment; filename="${release.fileName}"`, "Content-Length": String(release.bytes), "X-Content-SHA256": release.sha256, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
}
