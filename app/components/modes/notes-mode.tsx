"use client";

import { useState } from "react";

import type { StudySet } from "@/lib/learning-material";

export function NotesMode({ studySet }: { studySet: StudySet }) {
  const [copied, setCopied] = useState(false);

  async function copyNotes() {
    const notes = `${studySet.title}\n\n${studySet.summary}\n\n${studySet.bulletPoints
      .map((point) => `• ${point}`)
      .join("\n")}`;
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      setCopied(false);
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
        {studySet.bulletPoints.map((point, index) => (
          <li key={point}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{point}</p>
          </li>
        ))}
      </ol>

      <aside className="source-rule">
        <span>Quellenregel</span>
        Diese Notizen wurden nur aus deinem eingefügten Material erzeugt.
      </aside>
    </div>
  );
}
