import OpenAI from "openai";

export function openAIErrorResponse(error: unknown) {
  if (error instanceof OpenAI.RateLimitError) {
    return Response.json(
      { error: "Der Analyse-Dienst ist ausgelastet oder das API-Limit wurde erreicht. Bitte versuche es später erneut." },
      { status: 429 },
    );
  }

  if (error instanceof OpenAI.AuthenticationError) {
    return Response.json(
      { error: "Der Analyse-Dienst konnte nicht authentifiziert werden." },
      { status: 502 },
    );
  }

  if (error instanceof OpenAI.BadRequestError) {
    return Response.json(
      { error: "Die Lerninhalte konnten nicht zuverlässig strukturiert werden. Bitte formuliere den Auftrag etwas klarer." },
      { status: 422 },
    );
  }

  return Response.json(
    { error: "Die Erstellung ist fehlgeschlagen. Bitte versuche es erneut." },
    { status: 502 },
  );
}

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}
