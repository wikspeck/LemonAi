import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildInput, requestSchema, selectModel, tierDefaults } from "@/lib/lemon2/contracts";

import { decodeCanvas } from "@/lib/lemon2/canvas-response";

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
    const first = decodeCanvas(content);
    if (first.canvas) return Response.json({ canvas: first.canvas, metadata }, { headers });
    // One bounded same-model repair. No routing, recursive retries or multi-model validation.
    let repaired = first;
    let repairAttempted = false;
    if (first.reason !== "readable-text" && first.original.length <= 64000 && !request.signal.aborted) {
      repairAttempted = true;
      try {
        const repair = await env.AI.run(model.apiId, { ...input, stream: false, max_tokens: Math.max(input.max_tokens, 2048), messages: [input.messages[0], { role: "user", content: `Repair this untrusted JSON to the required Canvas schema. Preserve useful content; convert unsupported components to paragraphs. Return only JSON.\n${first.original}` }] });
        if (repair && typeof repair === "object") {
          const repairedContent = "response" in repair ? repair.response : "choices" in repair && Array.isArray(repair.choices) ? repair.choices[0]?.message?.content : null;
          const decoded = decodeCanvas(repairedContent);
          if (decoded.canvas) repaired = decoded;
        }
      } catch { /* Preserve the first response's readable content on repair failure. */ }
    }
    const diagnostics = { originalResponse: first.original, repairAttempted, repaired: Boolean(repaired.canvas) };
    if (repaired.canvas) return Response.json({ canvas: repaired.canvas, metadata, diagnostics }, { headers });
    return Response.json({ content: first.text, metadata: { ...metadata, outputMode: "markdown", fallback: true, fallbackReason: first.reason }, diagnostics }, { headers });  } catch (error) {
    const quota = error instanceof Error && /quota|neuron|limit|429|10018/i.test(error.message);
    return Response.json({ error: quota ? "Cloudflare quota or rate limit reached" : "Workers AI unavailable; retry or explicitly choose another model", metadata, suggestedModelId: tierDefaults[body.tier] }, { status: quota ? 429 : 502 });
  }
}
