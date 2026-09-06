import OpenAI from "openai";

export type ApiErrorCode =
  | "AI_AUTHENTICATION_FAILED"
  | "AI_NOT_CONFIGURED"
  | "AI_RATE_LIMITED"
  | "GENERATION_FAILED"
  | "INVALID_INPUT"
  | "INVALID_OUTPUT";

export function apiError(error: string, code: ApiErrorCode, status: number) {
  return Response.json({ error, code }, { status });
}

export function openAIConfigurationError() {
  return apiError(
    "Lemon AIs KI-Dienst ist noch nicht konfiguriert.",
    "AI_NOT_CONFIGURED",
    503,
  );
}

export function openAIErrorResponse(error: unknown) {
  if (error instanceof OpenAI.RateLimitError) {
    return apiError("Das API-Limit wurde erreicht. Bitte versuche es später erneut.", "AI_RATE_LIMITED", 429);
  }

  if (error instanceof OpenAI.AuthenticationError) {
    console.error("[Lemon AI] OpenAI rejected the configured server credential.");
    return apiError("Der KI-Dienst konnte nicht authentifiziert werden.", "AI_AUTHENTICATION_FAILED", 502);
  }

  if (error instanceof OpenAI.BadRequestError) {
    return apiError("Die Lerninhalte konnten nicht zuverlässig strukturiert werden. Bitte formuliere den Auftrag etwas klarer.", "INVALID_OUTPUT", 422);
  }

  console.error("[Lemon AI] OpenAI request failed without exposing request credentials.", error instanceof Error ? error.name : "UnknownError");
  return apiError("Die Erstellung ist fehlgeschlagen. Bitte versuche es erneut.", "GENERATION_FAILED", 502);
}
