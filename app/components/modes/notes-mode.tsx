"use client";

import { useState } from "react";

import type { Note } from "@/lib/workspace/schema";

type NotesModeProps = {
  title: string;
  notes: Note[];
  onGenerate: (prompt: string) => Promise<void>;
};

export function NotesMode({ title, notes, onGenerate }: NotesModeProps) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState("");

  async function copyNotes() {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${notes.map((note) => `• ${note.text}`).join("\n")}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      setCopied(false);
    }
  }

  async function create(prompt: string) {
    setPending(prompt);
    try {
      await onGenerate(prompt);
    } finally {
      setPending("");
    }
  }

  return (
    <div className="mode-stack">
      <div className="section-heading notes-heading">
        <div><p className="eyebrow">Strukturierte Notizen</p><h2>{title}</h2></div>
        <div className="output-actions">
          <button className="outline-button" onClick={copyNotes}>{copied ? "Kopiert" : "Kopieren"}</button>
          <button className="outline-button" disabled={Boolean(pending)} onClick={() => create(`Erstelle Karteikarten aus den Notizen „${title}“.`)}>Als Karten</button>
          <button className="outline-button" disabled={Boolean(pending)} onClick={() => create(`Erstelle ein Quiz aus den Notizen „${title}“.`)}>Als Quiz</button>
        </div>
      </div>
      <ol className="editorial-notes">
        {notes.map((note, index) => (
          <li key={note.id} className={`note-${note.importance}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div className="note-body">
              <p>{note.text}</p>
              <div className="note-actions">
                <button disabled={Boolean(pending)} onClick={() => create(`Erkläre diesen Punkt einfacher: ${note.text}`)}>
                  {pending.includes(note.text) ? "Wird erstellt …" : "Einfacher erklären"}
                </button>
                <button disabled={Boolean(pending)} onClick={() => create(`Teste mich zu diesem Punkt: ${note.text}`)}>Dazu testen</button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
