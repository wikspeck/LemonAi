"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";

import { workspaceSchema, type Workspace } from "@/lib/workspace/schema";

const MAX_CHARACTERS = 50_000;
const stages = [
  "Material wird gelesen",
  "Auftrag wird verstanden",
  "Schlüsselkonzepte werden gefunden",
  "Lernmaterial wird erstellt",
  "Workspace wird vorbereitet",
];

type StudyComposerProps = { onGenerated: (workspace: Workspace) => void };
type ErrorResponse = { error?: string };

export function StudyComposer({ onGenerated }: StudyComposerProps) {
  const [topic, setTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), 1_800);
    return () => window.clearInterval(timer);
  }, [isLoading]);

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
        body: JSON.stringify({ topic, sourceText, userPrompt }),
      });
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const errorResponse = data && typeof data === "object" ? data as ErrorResponse : null;
        throw new Error(errorResponse?.error || "Der Workspace konnte nicht erstellt werden.");
      }
      const workspace = workspaceSchema.safeParse(data);
      if (!workspace.success) throw new Error("Der Server hat keinen vollständigen Workspace zurückgegeben.");
      onGenerated(workspace.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Lemon AI konnte den Server nicht erreichen.");
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
      <div className="composer-heading"><div><p className="eyebrow">Neuer Workspace</p><h1 id="composer-title">Welches Thema lernst du?</h1></div></div>
      <form onSubmit={handleSubmit} onKeyDown={handleShortcut}>
        <div className="topic-input"><label className="input-label" htmlFor="topic">01 / Thema</label><input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Französische Revolution" maxLength={160} disabled={isLoading} autoFocus /></div>
        <div className="composer-input">
          <label className="input-label" htmlFor="source-material">02 / Erstes Material</label>
          <textarea id="source-material" value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="Füge Unterrichtsnotizen, einen Fachtext oder deine Zusammenfassung ein …" maxLength={MAX_CHARACTERS} disabled={isLoading} />
          <div className="composer-toolbar"><button type="button" className="quiet-button" onClick={() => setSourceText("")} disabled={isLoading || !sourceText}>Leeren</button><span>{sourceText.length.toLocaleString("de-DE")} / {MAX_CHARACTERS.toLocaleString("de-DE")}</span></div>
        </div>
        <div className="instruction-input"><label className="input-label" htmlFor="workspace-instruction">03 / Optionaler Auftrag</label><textarea id="workspace-instruction" value={userPrompt} onChange={(event) => setUserPrompt(event.target.value)} placeholder="Bereite mich auf eine Klassenarbeit vor …" maxLength={2_000} disabled={isLoading} rows={3} /><span>{userPrompt.length.toLocaleString("de-DE")} / 2.000</span></div>
        <div className="create-row"><p>Das Thema bleibt als Workspace bestehen. Du kannst später Material und neue Outputs ergänzen.</p><div><kbd>⌘ Enter</kbd><button type="submit" disabled={isLoading || !sourceText.trim()}>{isLoading ? <span className="loading-mark" aria-hidden="true" /> : null}{isLoading ? "Workspace wird erstellt" : "Workspace erstellen"}{!isLoading ? <span aria-hidden="true">→</span> : null}</button></div></div>
        {isLoading ? <div className="generation-progress" aria-live="polite"><div className="generation-track"><i style={{ width: `${((stage + 1) / stages.length) * 100}%` }} /></div><ol>{stages.map((label, index) => <li key={label} className={index < stage ? "done" : index === stage ? "active" : ""}><span>{index < stage ? "✓" : String(index + 1).padStart(2, "0")}</span>{label}</li>)}</ol></div> : null}
        {error ? <p className="error-banner" role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
