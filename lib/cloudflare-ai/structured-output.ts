import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import { InvalidAIOutputError, WorkersAIUnavailableError } from "@/lib/cloudflare-ai/errors";

export const CLOUDFLARE_AI_MODEL = "@cf/openai/gpt-oss-20b" as const;

type StructuredGenerationOptions<Schema extends z.ZodType> = {
  instructions: string;
  input: string;
  maxOutputTokens: number;
  schema: Schema;
  schemaName: string;
};

async function getWorkersAI() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.AI) throw new WorkersAIUnavailableError();
    return env.AI;
  } catch (error) {
    if (error instanceof WorkersAIUnavailableError) throw error;
    throw new WorkersAIUnavailableError();
  }
}

function readOutputText(result: ResponsesOutput | ChatCompletionsOutput) {
  if ("output_text" in result && typeof result.output_text === "string") {
    return result.output_text;
  }

  if ("choices" in result) {
    const content = result.choices[0]?.message.content;
    return typeof content === "string" ? content : undefined;
  }

  return undefined;
}

async function runOnce<Schema extends z.ZodType>(
  options: StructuredGenerationOptions<Schema>,
): Promise<z.output<Schema>> {
  const ai = await getWorkersAI();
  const jsonSchema = z.toJSONSchema(options.schema) as Record<string, unknown>;
  const result = await ai.run(CLOUDFLARE_AI_MODEL, {
    instructions: options.instructions,
    input: options.input,
    max_output_tokens: options.maxOutputTokens,
    temperature: 0.2,
    text: {
      format: {
        type: "json_schema",
        name: options.schemaName,
        schema: jsonSchema,
        strict: true,
      },
      verbosity: "low",
    },
  });

  const outputText = readOutputText(result);
  if (!outputText) throw new InvalidAIOutputError();

  let decoded: unknown;
  try {
    decoded = JSON.parse(outputText);
  } catch {
    throw new InvalidAIOutputError();
  }

  const parsed = options.schema.safeParse(decoded);
  if (!parsed.success) throw new InvalidAIOutputError();
  return parsed.data;
}

export async function generateStructured<Schema extends z.ZodType>(
  options: StructuredGenerationOptions<Schema>,
) {
  try {
    return await runOnce(options);
  } catch (error) {
    if (!(error instanceof InvalidAIOutputError)) throw error;
    return runOnce({
      ...options,
      instructions: `${options.instructions} Return one JSON object that strictly matches the supplied schema. Do not add Markdown or commentary.`,
    });
  }
}
