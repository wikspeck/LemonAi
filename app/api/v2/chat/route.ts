import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildInput, canvasSchema, requestSchema, selectModel, tierDefaults } from "@/lib/lemon2/contracts";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origin not allowed" }, { status: 403 });
  let data: unknown;
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Missing body" }, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 1000000) { await reader.cancel(); return Response.json({ error: "Request too large" }, { status: 413 }); }
      chunks.push(value);
    }
    data = JSON.parse(await new Blob(chunks as BlobPart[]).text());
  } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = requestSchema.safeParse(data);
  if (!parsed.success) return Response.json({ error: "Invalid Lemon 2 request", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) }, { status: 400 });
  const body = parsed.data;
  let model;
  try { model = selectModel(body.tier, body.modelId); }
  catch { return Response.json({ error: "Model unavailable for this tier", suggestedModelId: tierDefaults[body.tier] }, { status: 400 }); }
  const input = buildInput(body);
  const metadata = { engine: body.engine, tier: body.tier, effort: body.effort, outputMode: body.outputMode, modelId: model.id, apiModelId: model.apiId, fallback: false, effortImplementation: "application-output-budget-and-instructions" };
  try {
    if (request.signal.aborted) return Response.json({ error: "Canceled" }, { status: 499 });
    const { env } = await getCloudflareContext({ async: true });
    if (!env.AI) return Response.json({ error: "Workers AI binding unavailable" }, { status: 503 });
    const response = await env.AI.run(model.apiId, input);
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Lemon-Model": model.id, "X-Lemon-Tier": body.tier, "X-Lemon-Effort": body.effort };
    if (response instanceof ReadableStream) return new Response(response, { headers: { ...headers, "Content-Type": "text/event-stream" } });
    const result: unknown = response;
    let content: unknown;
    if (typeof result === "object" && result !== null) {
      if ("response" in result) content = result.response;
      else if ("choices" in result && Array.isArray(result.choices)) content = result.choices[0]?.message?.content;
    }
    if (body.outputMode === "canvas" && typeof content === "object" && content !== null) content = JSON.stringify(content);
    if (typeof content !== "string" || content.length > 1000000 || !content.trim()) return Response.json({ error: "Invalid or empty model output", metadata }, { status: 502, headers });
    if (body.outputMode !== "canvas") return Response.json({ content, metadata }, { headers });
    let decoded: unknown;
    try { decoded = JSON.parse(content); } catch { return Response.json({ content: "Die strukturierte Antwort ist ungültig. Bitte erneut versuchen oder Text wählen.", metadata: { ...metadata, outputMode: "text", fallback: true, fallbackReason: "malformed-canvas" } }, { headers }); }
    const validated = canvasSchema.safeParse(decoded);
    if (!validated.success) return Response.json({ content: "Die Canvas-Antwort enthält nicht unterstützte Komponenten oder ungültige Werte. Bitte erneut versuchen oder Text wählen.", metadata: { ...metadata, outputMode: "text", fallback: true, fallbackReason: "invalid-canvas" } }, { headers });
    return Response.json({ canvas: validated.data, metadata }, { headers });
  } catch (error) {
    const quota = error instanceof Error && /quota|neuron|limit|429|10018/i.test(error.message);
    return Response.json({ error: quota ? "Cloudflare quota or rate limit reached" : "Workers AI unavailable; retry or explicitly choose another model", metadata, suggestedModelId: tierDefaults[body.tier] }, { status: quota ? 429 : 502 });
  }
}

