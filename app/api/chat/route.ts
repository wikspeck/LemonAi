import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const schema = z.object({
  model: z.enum(["@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"]),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) })).min(1),
});

async function getAI() {
  try { return (await getCloudflareContext({ async: true })).env.AI; }
  catch { return null; }
}

export async function GET() {
  return Response.json({ configured: Boolean(await getAI()), mode: "workers-ai" });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Diese Anfrage ist nicht erlaubt." }, { status: 403 });
  }
  // Bound incoming data without silently trimming conversation history.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Nachricht fehlt." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_000_000) { await reader.cancel(); return Response.json({ error: "Die Unterhaltung ist zu groß. Bitte starte einen neuen Chat." }, { status: 413 }); }
    chunks.push(value);
  }
  let body;
  try { body = schema.safeParse(JSON.parse(await new Blob(chunks as BlobPart[]).text())); }
  catch { return Response.json({ error: "Ungültige Anfrage." }, { status: 400 }); }
  if (!body.success || body.data.messages.at(-1)?.role !== "user") return Response.json({ error: "Bitte wähle ein gültiges Modell und sende eine Nachricht." }, { status: 400 });
  const ai = await getAI();
  if (!ai) return Response.json({ error: "Cloudflare ist noch nicht verbunden. Bitte prüfe den Wrangler-Login und die AI-Bindung." }, { status: 503 });
  try {
    const system = [
      "Du bist Lemon AI, ein hilfreicher, klarer Gesprächspartner. Antworte in der Sprache des Nutzers. Sei ehrlich bei Unsicherheit.",
      "Formatiere Antworten mit Markdown, wenn es dem Inhalt hilft: **fett** für wichtige Begriffe, Listen für Aufzählungen und Überschriften für längere Antworten.",
      "Schreibe ausführbaren Code in eingezäunte Codeblöcke mit der passenden Sprachkennung, z. B. ```python oder ```javascript. Nutze Inline-Code für kurze Codebegriffe.",
      "Stelle strukturierte Vergleiche mit gemeinsamen Kriterien als Markdown-Tabelle dar, sofern der Nutzer kein anderes Format verlangt. Halte normale Gesprächsantworten natürlich und knapp.",
    ].join(" ");
    const stream = await ai.run(body.data.model, {
      messages: [{ role: "system", content: system }, ...body.data.messages], stream: true, max_tokens: 4096,
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const quota = /quota|limit|neuron|429|10018/i.test(message);
    return Response.json({ error: quota ? "Das kostenlose Cloudflare-Kontingent oder Modelllimit ist erreicht. Bitte versuche es später erneut. Es wird kein Upgrade ausgelöst." : "Cloudflare konnte die Antwort nicht starten. Bitte prüfe die Verbindung oder versuche es mit dem anderen Modell." }, { status: quota ? 429 : 502 });
  }
}
