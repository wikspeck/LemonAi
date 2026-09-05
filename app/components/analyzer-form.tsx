"use client";

import { FormEvent, useState } from "react";

import type { AnalysisResult } from "@/lib/learning-material";

type ErrorResponse = {
  error?: string;
};

export function AnalyzerForm() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Bitte füge zuerst Lernmaterial ein.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data: AnalysisResult | ErrorResponse = await response.json();

      if (!response.ok) {
        const message = "error" in data && data.error
          ? data.error
          : "Die Analyse ist fehlgeschlagen.";
        throw new Error(message);
      }

      setResult(data as AnalysisResult);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Die Analyse ist fehlgeschlagen. Bitte versuche es erneut.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label
          htmlFor="learning-material"
          className="block text-sm font-medium text-zinc-800"
        >
          Lernmaterial
        </label>
        <textarea
          id="learning-material"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Füge hier einen Text, Notizen oder Lernstoff ein …"
          rows={14}
          maxLength={50_000}
          disabled={isLoading}
          className="w-full resize-y rounded-xl border border-zinc-300 bg-white p-4 text-base leading-7 text-zinc-950 shadow-sm outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Wird analysiert …" : "Lernmaterial erstellen"}
        </button>
      </form>

      <div aria-live="polite">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <article className="mt-6 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-yellow-700">
                Analyse
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
                {result.title}
              </h2>
            </div>

            <p className="leading-7 text-zinc-700">{result.summary}</p>

            <ul className="list-disc space-y-3 pl-5 text-zinc-800 marker:text-yellow-500">
              {result.bulletPoints.map((bulletPoint, index) => (
                <li key={index}>{bulletPoint}</li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </div>
  );
}
