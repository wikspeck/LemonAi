import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import { InvalidAIOutputError, WorkersAIUnavailableError } from "@/lib/cloudflare-ai/errors";

export const CLOUDFLARE_AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct" as const;

type StructuredGenerationOptions<Schema extends z.ZodType> = {
  instructions: string;
  input: string;
  maxOutputTokens: number;
  schema: Schema;
  schemaName: string;
};

type ValidationDiagnostic = {
  path: string;
  code: string;
  expected?: string;
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

function validationDiagnostics(error: z.ZodError): ValidationDiagnostic[] {
  return error.issues.slice(0, 12).map((issue) => {
    const expected = Reflect.get(issue, "expected");
    return {
      path: issue.path.join(".") || "root",
      code: issue.code,
      expected: typeof expected === "string" ? expected : undefined,
    };
  });
}

function logInvalidOutput(
  schemaName: string,
  responseLength: number,
  reason: "empty" | "json" | "schema",
  diagnostics: ValidationDiagnostic[] = [],
) {
  console.error("[Lemon AI] Invalid Workers AI output", {
    model: CLOUDFLARE_AI_MODEL,
    schema: schemaName,
    responseLength,
    reason,
    diagnostics,
  });
}

async function requestJson(
  instructions: string,
  input: string,
  jsonSchema: Record<string, unknown>,
  maxOutputTokens: number,
) {
  const ai = await getWorkersAI();
  const result = await ai.run(CLOUDFLARE_AI_MODEL, {
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: input },
    ],
    guided_json: jsonSchema,
    max_tokens: maxOutputTokens,
    temperature: 0.1,
    top_p: 0.9,
  });
  return result.response;
}

export async function generateStructured<Schema extends z.ZodType>(
  options: StructuredGenerationOptions<Schema>,
): Promise<z.output<Schema>> {
  const jsonSchema = z.toJSONSchema(options.schema, { target: "draft-7" }) as Record<string, unknown>;
  const responseText = await requestJson(
    options.instructions,
    options.input,
    jsonSchema,
    options.maxOutputTokens,
  );

  if (!responseText.trim()) {
    logInvalidOutput(options.schemaName, 0, "empty");
    throw new InvalidAIOutputError();
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(responseText);
  } catch {
    logInvalidOutput(options.schemaName, responseText.length, "json");
    throw new InvalidAIOutputError();
  }

  const firstResult = options.schema.safeParse(decoded);
  if (firstResult.success) return firstResult.data;

  const diagnostics = validationDiagnostics(firstResult.error);
  logInvalidOutput(options.schemaName, responseText.length, "schema", diagnostics);

  const repairedText = await requestJson(
    [
      "Repair the supplied JSON so it strictly matches the supplied JSON Schema.",
      "Preserve the existing educational content and language.",
      "Change only fields needed to resolve the listed validation issues.",
      "Return only the repaired JSON object.",
    ].join(" "),
    [
      `VALIDATION_ISSUES\n${JSON.stringify(diagnostics)}`,
      `JSON_TO_REPAIR\n${JSON.stringify(decoded)}`,
    ].join("\n\n"),
    jsonSchema,
    options.maxOutputTokens,
  );

  let repaired: unknown;
  try {
    repaired = JSON.parse(repairedText);
  } catch {
    logInvalidOutput(options.schemaName, repairedText.length, "json");
    throw new InvalidAIOutputError();
  }

  const repairedResult = options.schema.safeParse(repaired);
  if (!repairedResult.success) {
    logInvalidOutput(
      options.schemaName,
      repairedText.length,
      "schema",
      validationDiagnostics(repairedResult.error),
    );
    throw new InvalidAIOutputError();
  }

  return repairedResult.data;
}
