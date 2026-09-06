"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { OverviewMode } from "@/app/components/modes/overview-mode";
import { OutputView } from "@/app/components/workspace/output-view";
import { outputCount, outputLabels } from "@/lib/workspace/output-meta";
import { workspaceOutputSchema, type Flashcard, type FlashcardRating, type QuizAttempt, type Workspace, type WorkspaceSection } from "@/lib/workspace/schema";

const sectionLabels: Record<WorkspaceSection, string> = {
  overview: "Übersicht",
  sources: "Quellen",
  outputs: "Outputs",
  progress: "Fortschritt",
};

type Props = {
  workspace: Workspace;
  recent: Workspace[];
  focusMode: boolean;
  onUpdate: (workspace: Workspace) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
};

export function StudyWorkspace({ workspace, recent, focusMode, onUpdate, onOpen, onDelete, onNew }: Props) {
  const [name, setName] = useState(workspace.title);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState("");
  const [error, setError] = useState("");
  const [addingSource, setAddingSource] = useState(false);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const section = workspace.progress.lastSection;
  const activeOutput = workspace.outputs.find((output) => output.id === workspace.progress.activeOutputId) ?? null;

  function commit(next: Workspace) {
    onUpdate({ ...next, updatedAt: new Date().toISOString() });
  }

  function setSection(nextSection: WorkspaceSection) {
    commit({ ...workspace, progress: { ...workspace.progress, lastSection: nextSection, activeOutputId: null } });
  }

  function openOutput(id: string) {
    commit({ ...workspace, progress: { ...workspace.progress, lastSection: "outputs", activeOutputId: id } });
  }

  function rename() {
    const title = name.trim();
    if (title && title !== workspace.title) commit({ ...workspace, title });
    else setName(workspace.title);
  }

  async function generate(requestPrompt: string) {
    const cleanPrompt = requestPrompt.trim();
    if (!cleanPrompt || generating) return;
    setGenerating(cleanPrompt);
    setError("");
    try {
      const response = await fetch("/api/workspace/output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: {
            id: workspace.id,
            title: workspace.title,
            sourceLanguage: workspace.sourceLanguage,
            sources: workspace.sources,
            concepts: workspace.concepts,
          },
          prompt: cleanPrompt,
        }),
      });
      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Der Output konnte nicht erstellt werden.";
        throw new Error(message);
      }
      const parsed = workspaceOutputSchema.safeParse(data);
      if (!parsed.success) throw new Error("Der Server hat keinen gültigen Output zurückgegeben.");
      const output = parsed.data;
      const now = new Date().toISOString();
      commit({
        ...workspace,
        outputs: [...workspace.outputs, output],
        prompts: [...workspace.prompts, { id: crypto.randomUUID(), text: cleanPrompt, createdAt: now, outputIds: [output.id] }],
        activity: [...workspace.activity, { id: crypto.randomUUID(), type: "outputCreated", title: `${output.title} erstellt`, createdAt: now, outputId: output.id }],
        progress: { ...workspace.progress, lastSection: "outputs", activeOutputId: output.id },
      });
      setPrompt("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Der Output konnte nicht erstellt werden.");
    } finally {
      setGenerating("");
    }
  }

  function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = sourceContent.trim();
    if (!content) return;
    const now = new Date().toISOString();
    const nextSource = {
      id: crypto.randomUUID(),
      type: "text" as const,
      title: sourceTitle.trim() || `Material ${workspace.sources.length + 1}`,
      content,
      createdAt: now,
    };
    commit({
      ...workspace,
      sources: [...workspace.sources, nextSource],
      activity: [...workspace.activity, { id: crypto.randomUUID(), type: "sourceAdded", title: `${nextSource.title} hinzugefügt`, createdAt: now, outputId: null }],
    });
    setSourceTitle("");
    setSourceContent("");
    setAddingSource(false);
  }

  function updateMastery(conceptId: string | null, delta: number) {
    if (!conceptId) return;
    commit({
      ...workspace,
      progress: {
        ...workspace.progress,
        conceptMastery: {
          ...workspace.progress.conceptMastery,
          [conceptId]: Math.max(0, Math.min(100, (workspace.progress.conceptMastery[conceptId] ?? 35) + delta)),
        },
      },
    });
  }

  function rateCard(card: Flashcard, rating: FlashcardRating) {
    const delta = rating === "easy" ? 10 : rating === "good" ? 6 : rating === "hard" ? -2 : -7;
    const nextMastery = card.conceptId ? {
      ...workspace.progress.conceptMastery,
      [card.conceptId]: Math.max(0, Math.min(100, (workspace.progress.conceptMastery[card.conceptId] ?? 35) + delta)),
    } : workspace.progress.conceptMastery;
    commit({ ...workspace, progress: { ...workspace.progress, flashcardRatings: { ...workspace.progress.flashcardRatings, [card.id]: rating }, conceptMastery: nextMastery } });
  }

  function completeQuiz(attempt: QuizAttempt) {
    const now = new Date().toISOString();
    commit({
      ...workspace,
      progress: { ...workspace.progress, quizAttempts: [...workspace.progress.quizAttempts, attempt] },
      activity: [...workspace.activity, { id: crypto.randomUUID(), type: "quizCompleted", title: `Quiz abgeschlossen: ${attempt.score}/${attempt.total}`, createdAt: now, outputId: attempt.outputId }],
    });
  }

  function resetCards(cards: Flashcard[]) {
    const ids = new Set(cards.map((card) => card.id));
    commit({ ...workspace, progress: { ...workspace.progress, flashcardRatings: Object.fromEntries(Object.entries(workspace.progress.flashcardRatings).filter(([id]) => !ids.has(id))) } });
  }

  function showSourceForm() {
    setAddingSource(true);
    setSection("sources");
  }

  const masteryValues = Object.values(workspace.progress.conceptMastery);
  const mastery = masteryValues.length ? Math.round(masteryValues.reduce((sum, value) => sum + value, 0) / masteryValues.length) : 0;

  return (
    <div className="workspace-shell">
      {!focusMode ? (
        <aside className="workspace-rail">
          <div className="rail-logo"><Image src="/assets/lemonlogo.svg" alt="Lemon AI" width={34} height={34} /></div>
          <button className="rail-new" onClick={onNew}>＋ Neuer Workspace</button>
          <div className="rail-heading"><span>Workspace</span><strong>{workspace.title}</strong></div>
          <nav>{(Object.keys(sectionLabels) as WorkspaceSection[]).map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}><span>{sectionLabels[item]}</span></button>)}</nav>
          <div className="recent-list"><span>Workspaces</span>{recent.slice(0, 7).map((item) => <div key={item.id}><button className={item.id === workspace.id ? "active" : ""} onClick={() => onOpen(item.id)}>{item.title}</button><button aria-label={`${item.title} löschen`} onClick={() => onDelete(item.id)}>×</button></div>)}</div>
        </aside>
      ) : null}

      <main className="workspace-main">
        <header className="workspace-titlebar">
          <div><p className="eyebrow">{workspace.sourceLanguage} · {workspace.sources.length} Quellen</p><input value={name} onChange={(event) => setName(event.target.value)} onBlur={rename} onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} aria-label="Workspace umbenennen" /></div>
          <div className="workspace-stats"><span><b>{workspace.outputs.length}</b> Outputs</span><span><b>{mastery}%</b> Mastery</span></div>
        </header>
        {!focusMode ? <nav className="mobile-tabs">{(Object.keys(sectionLabels) as WorkspaceSection[]).map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{sectionLabels[item]}</button>)}</nav> : null}

        <div className="workspace-content">
          {section === "overview" ? <OverviewMode workspace={workspace} onOpenOutput={openOutput} onNavigate={setSection} /> : null}
          {section === "sources" ? (
            <section className="sources-view">
              <div className="section-heading"><div><p className="eyebrow">Quellen</p><h2>Material für dieses Thema.</h2></div><button className="primary-button" onClick={() => setAddingSource((value) => !value)}>＋ Material</button></div>
              {addingSource ? <form className="source-form" onSubmit={addSource}><input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="Titel des Materials" maxLength={120} /><textarea value={sourceContent} onChange={(event) => setSourceContent(event.target.value)} placeholder="Weitere Notizen oder Lernmaterial …" maxLength={50_000} rows={10} /><div><button type="button" className="outline-button" onClick={() => setAddingSource(false)}>Abbrechen</button><button className="primary-button" disabled={!sourceContent.trim()}>Hinzufügen</button></div></form> : null}
              <div className="source-list">{workspace.sources.map((source, index) => <article key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{source.title}</h3><p>{source.content}</p><small>{new Date(source.createdAt).toLocaleDateString("de-DE")}</small></div></article>)}</div>
            </section>
          ) : null}
          {section === "outputs" && !activeOutput ? (
            <section><div className="section-heading"><div><p className="eyebrow">Output-Bibliothek</p><h2>Gespeichert und jederzeit nutzbar.</h2></div></div><div className="output-grid output-grid-full">{[...workspace.outputs].reverse().map((output) => <button key={output.id} className="output-card" onClick={() => openOutput(output.id)}><span>{outputLabels[output.type]}</span><h3>{output.title}</h3><p>{outputCount(output)}</p><i>Öffnen →</i></button>)}</div></section>
          ) : null}
          {section === "outputs" && activeOutput ? <OutputView key={activeOutput.id} workspace={workspace} output={activeOutput} onBack={() => setSection("outputs")} onGenerate={generate} onRate={rateCard} onMastery={updateMastery} onQuizComplete={completeQuiz} onResetCards={resetCards} /> : null}
          {section === "progress" ? (
            <section className="progress-view"><div className="section-heading"><div><p className="eyebrow">Fortschritt</p><h2>{mastery}% durchschnittliche Mastery.</h2></div></div><div className="progress-concepts">{[...workspace.concepts].sort((a, b) => (workspace.progress.conceptMastery[a.id] ?? 35) - (workspace.progress.conceptMastery[b.id] ?? 35)).map((concept) => <div key={concept.id}><span>{concept.name}</span><b>{workspace.progress.conceptMastery[concept.id] ?? 35}%</b><i><span style={{ width: `${workspace.progress.conceptMastery[concept.id] ?? 35}%` }} /></i></div>)}</div><div className="attempt-list"><h3>Quiz-Durchläufe</h3>{workspace.progress.quizAttempts.length ? [...workspace.progress.quizAttempts].reverse().map((attempt) => <p key={attempt.id}><span>{new Date(attempt.completedAt).toLocaleDateString("de-DE")}</span><b>{attempt.score}/{attempt.total}</b> · {attempt.incorrectIds.length} Fehler</p>) : <p>Noch kein Quiz abgeschlossen.</p>}</div></section>
          ) : null}
        </div>

        <form className="workspace-command" onSubmit={(event) => { event.preventDefault(); void generate(prompt); }}>
          <div className="command-quick"><button type="button" onClick={showSourceForm}>＋ Material</button>{["Flashcards", "Quiz", "Zusammenfassung", "Erklären", "Zeitleiste", "Vergleich"].map((label) => <button type="button" key={label} disabled={Boolean(generating)} onClick={() => void generate(`Erstelle ${label}.`)}>{label}</button>)}</div>
          <div><label htmlFor="workspace-command">Ask Lemon</label><input id="workspace-command" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Erstelle etwas, erkläre etwas oder teste mich …" disabled={Boolean(generating)} /><button className="primary-button" disabled={!prompt.trim() || Boolean(generating)}>{generating ? "Wird erstellt …" : "Senden →"}</button></div>
          {generating ? <p className="inline-generation" aria-live="polite">Lemon arbeitet · {generating}</p> : null}
          {error ? <p className="error-banner" role="alert">{error}</p> : null}
        </form>
      </main>
    </div>
  );
}
