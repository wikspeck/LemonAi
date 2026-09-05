import type { StudyWorkspace, WorkspaceProgress } from "@/lib/workspace/schema";

type OverviewModeProps = {
  workspace: StudyWorkspace;
  progress: WorkspaceProgress;
  onNavigate: (tab: "notes" | "flashcards" | "quiz" | "learn") => void;
};

export function OverviewMode({ workspace, progress, onNavigate }: OverviewModeProps) {
  const values = Object.values(progress.conceptMastery);
  const averageMastery = values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

  const modes = [
    { id: "notes" as const, label: "Notizen", value: workspace.bulletPoints.length, unit: "Kernpunkte" },
    { id: "flashcards" as const, label: "Karteikarten", value: workspace.flashcards.length, unit: "Karten" },
    {
      id: "quiz" as const,
      label: "Quiz",
      value: workspace.quizzes.multipleChoice.length + workspace.quizzes.trueFalse.length + workspace.quizzes.shortAnswer.length + workspace.quizzes.fillBlank.length,
      unit: "Aufgaben",
    },
    { id: "learn" as const, label: "Lernmodus", value: averageMastery, unit: "% Mastery" },
  ];

  return (
    <div className="mode-stack">
      <section className="summary-block">
        <p className="eyebrow">Kurzfassung</p>
        <p>{studySet.summary}</p>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Arbeitsfläche</p>
            <h2>Dein Material, in fünf Perspektiven.</h2>
          </div>
          <span className="muted-copy">Lokal in dieser Sitzung</span>
        </div>

        <div className="mode-grid">
          {modes.map((mode, index) => (
            <button key={mode.id} className="mode-card" onClick={() => onNavigate(mode.id)}>
              <span className="mode-index">0{index + 1}</span>
              <span className="mode-card-name">{mode.label}</span>
              <strong>{mode.value}</strong>
              <span>{mode.unit}</span>
              <i aria-hidden="true">→</i>
            </button>
          ))}
        </div>
      </section>

      <section className="concept-strip">
        <div>
          <p className="eyebrow">Konzeptabdeckung</p>
          <h2>{workspace.concepts.length} Themen erkannt</h2>
        </div>
        <div className="concept-list">
          {workspace.concepts.slice(0, 6).map((concept) => (
            <span key={concept.id}>{concept.name}<i style={{ width: `${progress.conceptMastery[concept.id] ?? 35}%` }} /></span>
          ))}
        </div>
      </section>

      <section className="overview-concepts">
        <div className="section-heading"><div><p className="eyebrow">Schlüsselkonzepte</p><h2>Orientierung im Stoff.</h2></div></div>
        <div>
          {workspace.concepts.map((concept) => (
            <article key={concept.id}>
              <span>{concept.importance}</span>
              <h3>{concept.name}</h3>
              <p>{concept.explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
