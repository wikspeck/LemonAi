import OpenAI from "openai";

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type OpenAIService = {
  client: OpenAI;
  model: string;
};

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readCloudflareBinding(name: "OPENAI_API_KEY" | "OPENAI_MODEL") {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    return nonEmptyString(Reflect.get(env, name));
  } catch {
    return undefined;
  }
}

export async function createOpenAIService(): Promise<OpenAIService | null> {
  const apiKey = nonEmptyString(process.env.OPENAI_API_KEY)
    ?? await readCloudflareBinding("OPENAI_API_KEY");

  if (!apiKey) {
    console.error("[Lemon AI] OPENAI_API_KEY is unavailable in the server runtime.");
    return null;
  }

  const model = nonEmptyString(process.env.OPENAI_MODEL)
    ?? await readCloudflareBinding("OPENAI_MODEL")
    ?? DEFAULT_OPENAI_MODEL;

  return { client: new OpenAI({ apiKey }), model };
}
