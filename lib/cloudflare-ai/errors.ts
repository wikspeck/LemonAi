export type ApiErrorCode =
  | "AI_GENERATION_FAILED"
  | "AI_NOT_AVAILABLE"
  | "AI_RATE_LIMITED"
  | "INVALID_AI_OUTPUT"
  | "INVALID_INPUT";

export class WorkersAIUnavailableError extends Error {
  constructor() {
    super("The Workers AI binding is unavailable.");
    this.name = "WorkersAIUnavailableError";
  }
}

export class InvalidAIOutputError extends Error {
  constructor() {
    super("Workers AI returned output that did not match the requested schema.");
    this.name = "InvalidAIOutputError";
  }
}

export function apiError(error: string, code: ApiErrorCode, status: number) {
  return Response.json({ error, code }, { status });
}

function numericProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = Reflect.get(value, property);
  return typeof candidate === "number" ? candidate : undefined;
}

function stringProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = Reflect.get(value, property);
  return typeof candidate === "string" ? candidate : undefined;
}

export function workersAIErrorResponse(error: unknown) {
  if (error instanceof WorkersAIUnavailableError) {
    return apiError(
      "Lemon AIs KI-Dienst ist in dieser Umgebung nicht verfügbar.",
      "AI_NOT_AVAILABLE",
      503,
    );
  }

  if (error instanceof InvalidAIOutputError) {
    return apiError(
      "Die KI hat kein zuverlässig strukturiertes Lernmaterial zurückgegeben. Bitte versuche es erneut.",
      "INVALID_AI_OUTPUT",
      502,
    );
  }

  const status = numericProperty(error, "status");
  const code = stringProperty(error, "code")?.toLowerCase();
  if (status === 429 || code?.includes("rate") || code?.includes("quota")) {
    return apiError(
      "Das KI-Limit wurde erreicht. Bitte versuche es später erneut.",
      "AI_RATE_LIMITED",
      429,
    );
  }

  console.error(
    "[Lemon AI] Workers AI request failed.",
    error instanceof Error ? error.name : "UnknownError",
  );
  return apiError(
    "Die Erstellung ist fehlgeschlagen. Bitte versuche es erneut.",
    "AI_GENERATION_FAILED",
    502,
  );
}
