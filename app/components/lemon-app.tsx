"use client";

import { useEffect, useState } from "react";

import { StudyComposer } from "@/app/components/study-composer";
import { StudyWorkspace, type WorkspaceTab } from "@/app/components/study-workspace";
import type { StudySet } from "@/lib/learning-material";

const tabShortcuts: WorkspaceTab[] = ["overview", "notes", "flashcards", "quiz", "learn"];

export function LemonApp() {
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setFocusMode(false);
        return;
      }
      const target = event.target as HTMLElement;
      if (studySet && !["INPUT", "TEXTAREA"].includes(target.tagName)) {
        const shortcutIndex = Number(event.key) - 1;
        if (tabShortcuts[shortcutIndex]) setActiveTab(tabShortcuts[shortcutIndex]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [studySet]);

  function startNewSet() {
    setStudySet(null);
    setActiveTab("overview");
    setFocusMode(false);
    setPaletteOpen(false);
  }

  function runCommand(tab: WorkspaceTab) {
    setActiveTab(tab);
    setPaletteOpen(false);
  }

  return (
    <div className={`lemon-app ${focusMode ? "focus-mode" : ""}`}>
      <header className="topbar">
        <button className="wordmark" onClick={startNewSet} aria-label="Lemon AI Startseite">
          <span>L</span><strong>Lemon AI</strong>
        </button>

        <nav aria-label="Hauptnavigation">
          <button className="active">Workspace</button>
          <button disabled title="Gespeicherte Sets folgen später">Bibliothek</button>
        </nav>

        <div className="topbar-actions">
          {studySet ? (
            <button className={`focus-toggle ${focusMode ? "active" : ""}`} aria-pressed={focusMode} onClick={() => setFocusMode((current) => !current)}>
              <i aria-hidden="true" /> Fokus
            </button>
          ) : null}
          <button className="command-trigger" onClick={() => setPaletteOpen(true)}>
            Befehle <kbd>⌘ K</kbd>
          </button>
          {studySet ? <button className="new-set-button" onClick={startNewSet}>Neues Set</button> : null}
        </div>
      </header>

      {studySet ? (
        <StudyWorkspace studySet={studySet} activeTab={activeTab} onTabChange={setActiveTab} />
      ) : (
        <main className="composer-page">
          <div className="composer-aside">
            <span>LEMON / 01</span>
            <p>Aus Rohmaterial wird ein Arbeitsraum zum Verstehen, Prüfen und Wiederholen.</p>
          </div>
          <StudyComposer
            onGenerated={(generatedSet) => {
              setStudySet(generatedSet);
              setActiveTab("overview");
            }}
          />
        </main>
      )}

      {paletteOpen ? (
        <div className="palette-backdrop" onMouseDown={() => setPaletteOpen(false)}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Schnellbefehle" onMouseDown={(event) => event.stopPropagation()}>
            <header><span>⌘</span><input autoFocus placeholder="Befehl suchen …" aria-label="Befehl suchen" /></header>
            <div>
              <p>Navigation</p>
              {studySet ? tabShortcuts.map((tab, index) => (
                <button key={tab} onClick={() => runCommand(tab)}>
                  <span>{["Übersicht öffnen", "Notizen öffnen", "Karteikarten öffnen", "Quiz starten", "Adaptiv lernen"][index]}</span>
                  <kbd>{index + 1}</kbd>
                </button>
              )) : <span className="palette-empty">Erstelle zuerst ein Lernset.</span>}
              <p>Workspace</p>
              {studySet ? <button onClick={() => { setFocusMode((current) => !current); setPaletteOpen(false); }}><span>Fokusmodus umschalten</span><kbd>Esc</kbd></button> : null}
              <button onClick={startNewSet}><span>Neues Lernset</span></button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
