import { getCloudflareContext } from "@opennextjs/cloudflare";
import release from "@/public/downloads/release.json";
export async function GET(request: Request) {
 const manifest = release as { published: boolean; bytes: number; sha256: string; parts: string[]; fileName: string };
 if (!manifest.published || !manifest.parts.length) return new Response("Release not published", { status:404 });
 const { env } = await getCloudflareContext({ async:true });
 const assets = env.ASSETS; if (!assets) return new Response("Download service unavailable", {status:503});
 let index = 0; let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
 const stream = new ReadableStream<Uint8Array>({
  async pull(controller) {
   try {
    while (true) {
     if (!reader) {
      if (index >= manifest.parts.length) { controller.close(); return; }
      const asset = await assets.fetch(new Request(new URL(manifest.parts[index++], request.url)));
      if (!asset.ok || !asset.body) throw new Error("Download segment unavailable");
      reader = asset.body.getReader();
     }
     const chunk = await reader.read();
     if (chunk.done) { reader.releaseLock(); reader = null; continue; }
     controller.enqueue(chunk.value); return;
    }
   } catch(error) { controller.error(error); }
  },
  async cancel() { await reader?.cancel(); },
 });
 return new Response(stream,{headers:{"Content-Type":"application/vnd.microsoft.portable-executable","Content-Disposition":`attachment; filename="${manifest.fileName}"`,"Content-Length":String(manifest.bytes),"Cache-Control":"no-store","X-Content-SHA256":manifest.sha256,"X-Content-Type-Options":"nosniff"}});
}

