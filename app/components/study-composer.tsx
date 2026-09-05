"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";

import type { StudyWorkspace } from "@/lib/workspace/schema";

const MAX_CHARACTERS = 50_000;

type StudyComposerProps = {
  onGenerated: (workspace: StudyWorkspace) => void;
};

type ErrorResponse = { error?: string };

export function StudyComposer({ onGenerated }: StudyComposerProps) {
  const [sourceText, setSourceText] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState(0);

  const stages = [
    "Material wird gelesen",
    "Auftrag wird verstanden",
    "Schlüsselkonzepte werden gefunden",
    "Lernmodule werden erstellt",
    "Workspace wird vorbereitet",
  ];

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setInterval(
      () => setStage((current) => Math.min(current + 1, stages.length - 1)),
      1_800,
    );
    return () => window.clearInterval(timer);
  }, [isLoading, stages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading || !sourceText.trim()) {
      setError("Bitte füge zuerst Lernmaterial ein.");
      return;
    }

    setError("");
    setIsLoading(true);
    setStage(0);

    try {
      const response = await fetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, userPrompt }),
      });
      const data = (await response.json().catch(() => null)) as StudyWorkspace | ErrorResponse | null;

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

  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.requestSubmit();
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

      <form onSubmit={handleSubmit} onKeyDown={handleShortcut}>
        <div className="composer-input">
          <label className="input-label" htmlFor="source-material">01 / Lernmaterial</label>
          <textarea
            id="source-material"
            aria-label="Lernmaterial"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
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
              {sourceText ? (
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => {
                    setSourceText("");
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  Leeren
                </button>
              ) : null}
            </div>

            <div className="composer-submit">
              <span>{sourceText.length.toLocaleString("de-DE")} / {MAX_CHARACTERS.toLocaleString("de-DE")}</span>
            </div>
          </div>
        </div>

        <div className="instruction-input">
          <label className="input-label" htmlFor="workspace-instruction">02 / Dein Auftrag</label>
          <textarea
            id="workspace-instruction"
            value={userPrompt}
            onChange={(event) => setUserPrompt(event.target.value)}
            placeholder="Zum Beispiel: Mach kurze Stichpunkte, Flashcards und ein schweres Quiz …"
            maxLength={2_000}
            disabled={isLoading}
            rows={3}
          />
          <span>{userPrompt.length.toLocaleString("de-DE")} / 2.000</span>
        </div>

        <div className="create-row">
          <p>Ohne Auftrag erstellt Lemon Zusammenfassung, Notizen, Karteikarten und Multiple Choice.</p>
          <div>
            <kbd>⌘ Enter</kbd>
            <button type="submit" disabled={isLoading || !sourceText.trim()}>
                {isLoading ? <span className="loading-mark" aria-hidden="true" /> : null}
                {isLoading ? "Workspace wird erstellt" : "Workspace erstellen"}
                {!isLoading ? <span aria-hidden="true">↗</span> : null}
              </button>
          </div>
        </div>

        {isLoading ? (
          <div className="generation-progress" aria-live="polite">
            <div className="generation-track"><i style={{ width: `${((stage + 1) / stages.length) * 100}%` }} /></div>
            <ol>
              {stages.map((label, index) => (
                <li key={label} className={index < stage ? "done" : index === stage ? "active" : ""}>
                  <span>{index < stage ? "✓" : String(index + 1).padStart(2, "0")}</span>{label}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <p className="composer-hint">
          Lemon trennt dein Quellenmaterial vom Arbeitsauftrag und nutzt beides nur für diesen Workspace.
        </p>
        <div aria-live="polite">
          {error ? <p className="error-banner" role="alert">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
