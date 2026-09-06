"use client";

import { useState } from "react";

import { workspaceActionResultSchema, type Note, type StudyWorkspace, type WorkspaceAction, type WorkspaceActionResult } from "@/lib/workspace/schema";

type NotesModeProps = {
  workspace: StudyWorkspace;
  explanations: Record<string, { simplerExplanation: string | null }>;
  onApplyAction: (note: Note, result: WorkspaceActionResult) => void;
};

export function NotesMode({ workspace, explanations, onApplyAction }: NotesModeProps) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function copyNotes() {
    const notes = `${workspace.title}\n\n${workspace.summary}\n\n${workspace.bulletPoints
      .map((point) => `• ${point.text}`)
      .join("\n")}`;
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      setCopied(false);
    }
  }

  async function runAction(note: Note, action: WorkspaceAction) {
    const actionKey = `${note.id}:${action}`;
    setPending(actionKey);
    setError("");
    try {
      const response = await fetch("/api/workspace/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          sourceText: workspace.sourceText,
          sourceLanguage: workspace.sourceLanguage,
          action,
          note: { id: note.id, text: note.text },
        }),
      });
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const errorMessage = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Die Lernaktion ist fehlgeschlagen.";
        throw new Error(errorMessage);
      }
      const result = workspaceActionResultSchema.safeParse(data);
      if (!result.success) throw new Error("Die Lernaktion hat ein ungültiges Ergebnis geliefert.");
      onApplyAction(note, result.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Die Lernaktion ist fehlgeschlagen.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mode-stack">
      <div className="section-heading notes-heading">
        <div>
          <p className="eyebrow">Strukturierte Notizen</p>
          <h2>Das Wesentliche, ohne Rauschen.</h2>
        </div>
        <button className="outline-button" onClick={copyNotes}>
          {copied ? "Kopiert" : "Alles kopieren"}
        </button>
      </div>

      <ol className="editorial-notes">
        {workspace.bulletPoints.map((point, index) => (
          <li key={point.id} className={`note-${point.importance}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div className="note-body">
              <p>{point.text}</p>
              {explanations[point.id]?.simplerExplanation ? (
                <aside><strong>Einfacher erklärt</strong>{explanations[point.id].simplerExplanation}</aside>
              ) : null}
              <div className="note-actions">
                <button disabled={pending !== null} onClick={() => runAction(point, "explainSimpler")}>
                  {pending === `${point.id}:explainSimpler` ? "Erklärt …" : "Einfacher erklären"}
                </button>
                <button disabled={pending !== null} onClick={() => runAction(point, "testMe")}>
                  {pending === `${point.id}:testMe` ? "Erstellt …" : "Dazu testen"}
                </button>
                <button disabled={pending !== null} onClick={() => runAction(point, "makeFlashcard")}>
                  {pending === `${point.id}:makeFlashcard` ? "Erstellt …" : "Als Karte"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {error ? <p className="error-banner" role="alert">{error}</p> : null}

      <aside className="source-rule">
        <span>Quellenregel</span>
        Diese Notizen wurden nur aus deinem eingefügten Material erzeugt.
      </aside>
    </div>
  );
}
