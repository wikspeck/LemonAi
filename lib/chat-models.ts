export const chatModels = [
  { id: "@cf/meta/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", provider: "Meta", context: "131.000", description: "Viel Platz für Texte und Ideen", available: true },
  { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", name: "Llama 3.3 70B", provider: "Meta", context: "24.000", description: "Für Schreiben, Fragen und Erklärungen", available: true },
  { id: "openai/gpt-4.1", name: "GPT-4.1", provider: "OpenAI", context: "1 Mio.", description: "Benötigt kostenpflichtigen Zugang · deaktiviert", available: false },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 mini", provider: "OpenAI", context: "1 Mio.", description: "Benötigt kostenpflichtigen Zugang · deaktiviert", available: false },
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic", context: "1 Mio.", description: "Benötigt kostenpflichtigen Zugang · deaktiviert", available: false },
] as const;
export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; model?: string };
export type Chat = { id: string; title: string; model: string; messages: ChatMessage[] };
