"use client";

import { useState, type FormEvent } from "react";

import type { StudySet } from "@/lib/learning-material";

const MAX_CHARACTERS = 50_000;

type StudyComposerProps = {
  onGenerated: (studySet: StudySet) => void;
};

type ErrorResponse = { error?: string };

export function StudyComposer({ onGenerated }: StudyComposerProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Bitte füge zuerst Lernmaterial ein.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json().catch(() => null)) as StudySet | ErrorResponse | null;

      if (!response.ok) {
        const message = data && "error" in data && data.error
          ? data.error
          : "Das Lernset konnte nicht erstellt werden.";
        throw new Error(message);
      }

      if (!data || !("title" in data)) {
        throw new Error("Der Server hat kein vollständiges Lernset zurückgegeben.");
      }

      onGenerated(data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Das Lernset konnte nicht erstellt werden.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="composer-panel" aria-labelledby="composer-title">
      <div className="composer-heading">
        <div>
          <p className="eyebrow">Neues Lernset</p>
          <h1 id="composer-title">Was möchtest du verstehen?</h1>
        </div>
        <span className="status-pill"><i /> Textmodus</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="composer-input">
          <textarea
            aria-label="Lernmaterial"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Füge Vorlesungsnotizen, einen Fachtext oder deine Zusammenfassung ein …"
            maxLength={MAX_CHARACTERS}
            disabled={isLoading}
            autoFocus
          />

          <div className="composer-toolbar">
            <div className="composer-actions">
              <button
                type="button"
                className="quiet-button"
                disabled
                title="Datei-Upload folgt in einer späteren Version"
              >
                <span aria-hidden="true">＋</span> Datei
                <small>Bald</small>
              </button>
              {text ? (
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => {
                    setText("");
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  Leeren
                </button>
              ) : null}
            </div>

            <div className="composer-submit">
              <span>{text.length.toLocaleString("de-DE")} / {MAX_CHARACTERS.toLocaleString("de-DE")}</span>
              <button type="submit" disabled={isLoading || !text.trim()}>
                {isLoading ? <span className="loading-mark" aria-hidden="true" /> : null}
                {isLoading ? "Strukturiere Material" : "Lernset erstellen"}
                {!isLoading ? <span aria-hidden="true">↗</span> : null}
              </button>
            </div>
          </div>
        </div>

        <p className="composer-hint">
          Lemon arbeitet ausschließlich mit deinem Material. Je klarer die Quelle, desto präziser das Lernset.
        </p>
        <div aria-live="polite">
          {error ? <p className="error-banner" role="alert">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
