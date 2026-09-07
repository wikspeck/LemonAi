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
  message: string;
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
      message: issue.message.slice(0, 180),
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
): Promise<unknown> {
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

function responseLength(value: unknown) {
  if (typeof value === "string") return value.length;
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

function decodeJsonResponse(value: unknown, schemaName: string) {
  if (typeof value === "string") {
    if (!value.trim()) {
      logInvalidOutput(schemaName, 0, "empty");
      throw new InvalidAIOutputError();
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      logInvalidOutput(schemaName, value.length, "json");
      throw new InvalidAIOutputError();
    }
  }

  if (typeof value === "object" && value !== null) return value;

  logInvalidOutput(schemaName, responseLength(value), "empty");
  throw new InvalidAIOutputError();
}

export async function generateStructured<Schema extends z.ZodType>(
  options: StructuredGenerationOptions<Schema>,
): Promise<z.output<Schema>> {
  const jsonSchema = z.toJSONSchema(options.schema, { target: "draft-7" }) as Record<string, unknown>;
  const response = await requestJson(
    options.instructions,
    options.input,
    jsonSchema,
    options.maxOutputTokens,
  );

  const decoded = decodeJsonResponse(response, options.schemaName);

  const firstResult = options.schema.safeParse(decoded);
  if (firstResult.success) return firstResult.data;

  const diagnostics = validationDiagnostics(firstResult.error);
  logInvalidOutput(options.schemaName, responseLength(response), "schema", diagnostics);

  const repairedResponse = await requestJson(
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

  const repaired = decodeJsonResponse(repairedResponse, options.schemaName);

  const repairedResult = options.schema.safeParse(repaired);
  if (!repairedResult.success) {
    logInvalidOutput(
      options.schemaName,
      responseLength(repairedResponse),
      "schema",
      validationDiagnostics(repairedResult.error),
    );
    throw new InvalidAIOutputError();
  }

  return repairedResult.data;
}
