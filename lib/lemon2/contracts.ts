import { z } from "zod";

export const tiers = ["vortex", "zenith", "apex"] as const;
export const efforts = ["low", "medium", "high"] as const;
export const outputModes = ["text", "markdown", "canvas"] as const;
export const registry = [
  { id: "qwen38", name: "Qwen 3.8 27B", apiId: "@cf/qwen/qwen3.8-27b", family: "Qwen", tier: "apex", context: 262144, inputPrice: 0.45, outputPrice: 3.20, license: "Apache-2.0", enabled: true },
  { id: "glm47", name: "GLM 4.7 Flash", apiId: "@cf/zai-org/glm-4.7-flash", family: "GLM", tier: "zenith", context: 131072, inputPrice: 0.0605, outputPrice: 0.40, license: "MIT", enabled: true },
  { id: "deepseek41", name: "DeepSeek V4.1 Flash", apiId: "@cf/deepseek-ai/deepseek-v4.1-flash-1017", family: "DeepSeek", tier: "apex", context: 1048576, inputPrice: 0.30, outputPrice: 1.20, license: "See upstream terms; not enabled", enabled: false },
  { id: "qwen3", name: "Qwen3 30B A3B", apiId: "@cf/qwen/qwen3-30b-a3b-fp8", family: "Qwen", tier: "vortex", context: 32768, inputPrice: 0.0509, outputPrice: 0.335, license: "Apache-2.0", enabled: true },
  { id: "scout", name: "Llama 4 Scout", apiId: "@cf/meta/llama-4-scout-17b-16e-instruct", family: "Llama", tier: "zenith", context: 131000, inputPrice: null, outputPrice: null, license: "Llama 4 Community License", enabled: true },
  { id: "gemma4", name: "Gemma 4 26B A4B", apiId: "@cf/google/gemma-4-26b-a4b-it", family: "Gemma", tier: "apex", context: 256000, inputPrice: 0.1, outputPrice: 0.3, license: "Apache-2.0", enabled: true },
  { id: "llama33", name: "Llama 3.3 70B", apiId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", family: "Llama", tier: "zenith", context: 24000, inputPrice: null, outputPrice: null, license: "Llama 3.3 Community License", enabled: true },
  { id: "deepseek", name: "DeepSeek R1 Distill Qwen 32B", apiId: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", family: "DeepSeek", tier: "apex", context: 80000, inputPrice: 0.497, outputPrice: 4.881, license: "MIT; Qwen2.5 base Apache-2.0", enabled: false },
  { id: "mistral", name: "Mistral Small 3.1 24B", apiId: "@cf/mistralai/mistral-small-3.1-24b-instruct", family: "Mistral", tier: "zenith", context: 128000, inputPrice: 0.351, outputPrice: 0.555, license: "Apache-2.0", enabled: true },
].map(model => ({ ...model, provider: "cloudflare-workers-ai", streaming: true, structuredOutput: model.id === "scout" ? "guided-json-and-validation" : "json-object-and-validation", nativeEffort: model.id === "qwen38", availability: model.id === "deepseek41" ? "disabled-workers-paid-plan-required" : ["qwen38","glm47"].includes(model.id) ? "stream-and-canvas-tested-2026-10-25" : model.id === "deepseek" ? "disabled-reasoning-output-needs-parser" : "inference-tested-2026-10-24", verifiedAt: ["qwen38","glm47","deepseek41"].includes(model.id) ? "2026-10-25" : "2026-10-24", pricingUnit: "USD per million tokens; account plan applies", documentation: `https://developers.cloudflare.com/workers-ai/models/${model.apiId.split("/").at(-1)}/` }));

export const tierDefaults: Record<typeof tiers[number], string> = { vortex: "qwen3", zenith: "mistral", apex: "qwen38" };
export const effortSettings = {
  low: { max_tokens: 1024, instruction: "Answer concisely. Use a direct approach." },
  medium: { max_tokens: 2048, instruction: "Give an appropriately detailed, well-organized answer." },
  high: { max_tokens: 4096, instruction: "Check your answer for consistency before responding. Explain relevant assumptions and provide detail where useful." },
} as const;

const key = z.string().regex(/^[a-z][a-z0-9_]{0,31}$/);
const text = z.string().max(12000);
export const canvasComponent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text }).strict(),
  z.object({ type: z.literal("paragraph"), text }).strict(),
  z.object({ type: z.literal("checkbox"), label: text, key, initial: z.boolean() }).strict(),
  z.object({ type: z.literal("slider"), label: text, key, min: z.number().finite(), max: z.number().finite(), initial: z.number().finite() }).strict(),
  z.object({ type: z.literal("calculation"), label: text, operation: z.enum(["add", "multiply"]), inputs: z.array(key).min(1).max(8) }).strict(),
]);
const canvasBase = z.object({ version: z.literal(1), title: z.string().max(160), components: z.array(canvasComponent).min(1).max(64) }).strict();
export const canvasJsonSchema = z.toJSONSchema(canvasBase);
export const canvasSchema = canvasBase.superRefine((canvas, ctx) => {
  const numeric = new Set<string>(); const keys = new Set<string>();
  canvas.components.forEach((component, index) => {
    if ("key" in component) {
      if (keys.has(component.key) || ["constructor", "prototype", "__proto__"].includes(component.key)) ctx.addIssue({ code: "custom", path: ["components", index], message: "Unsafe or duplicate state key" });
      keys.add(component.key);
    }
    if (component.type === "slider") {
      numeric.add(component.key);
      if (component.min >= component.max || component.initial < component.min || component.initial > component.max || Math.abs(component.min) > 1e9 || Math.abs(component.max) > 1e9) ctx.addIssue({ code: "custom", path: ["components", index], message: "Invalid slider range" });
    }
  });
  canvas.components.forEach((component, index) => {
    if (component.type === "calculation" && component.inputs.some(input => !numeric.has(input))) ctx.addIssue({ code: "custom", path: ["components", index], message: "Calculation requires numeric state keys" });
  });
});
export const requestSchema = z.object({
  engine: z.literal("lemon2"), tier: z.enum(tiers), effort: z.enum(efforts), outputMode: z.enum(outputModes),
  responseLanguage: z.enum(["auto", "en", "de", "pl"]).default("auto"), modelId: z.string().max(64).optional(), stream: z.boolean().default(true),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(200000) }).strict()).min(1).max(1000),
}).strict().refine(body => body.messages.at(-1)?.role === "user", "Last message must be from user");
export function selectModel(tier: typeof tiers[number], modelId?: string) {
  const model = registry.find(model => model.id === (modelId ?? tierDefaults[tier]) && model.enabled && model.tier === tier);
  if (!model) throw new Error("Model is unavailable or does not belong to the selected tier");
  return model;
}
export function buildInput(body: z.infer<typeof requestSchema>) {
  const effort = effortSettings[body.effort];
  const language = body.responseLanguage === "auto" ? "Answer in the user\u0027s language." : `The user prefers answers in ${ {en:"English",de:"German",pl:"Polish"}[body.responseLanguage]}.`;
  const format = body.outputMode === "canvas" ? `Return ONLY JSON matching this schema: ${JSON.stringify(canvasJsonSchema)}. Use unique state keys, valid slider ranges and calculations referring only to slider keys. Use paragraphs for simple answers. Never generate executable code or markup properties.` : body.outputMode === "text" ? "Return plain text without Markdown formatting." : "Use Markdown when helpful.";
  const structured = body.outputMode === "canvas" ? (selectModel(body.tier, body.modelId).id === "scout" ? { guided_json: canvasJsonSchema } : { response_format: { type: "json_object" as const } }) : {};
  const native = selectModel(body.tier, body.modelId).id === "qwen38" ? { reasoning_effort: { low: "low", medium: "medium", high: "xhigh" }[body.effort] } : {};
  return { ...structured, ...native, messages: [{ role: "system" as const, content: `You are Lemon 2. ${language} Be honest about uncertainty. ${effort.instruction} ${format}` }, ...body.messages], max_tokens: effort.max_tokens, stream: body.stream && body.outputMode !== "canvas" };
}
