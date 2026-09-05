import type { ConceptMastery, StudySet } from "@/lib/learning-material";

type OverviewModeProps = {
  studySet: StudySet;
  mastery: ConceptMastery;
  onNavigate: (tab: "notes" | "flashcards" | "quiz" | "learn") => void;
};

export function OverviewMode({ studySet, mastery, onNavigate }: OverviewModeProps) {
  const values = Object.values(mastery);
  const averageMastery = values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

  const modes = [
    { id: "notes" as const, label: "Notizen", value: studySet.bulletPoints.length, unit: "Kernpunkte" },
    { id: "flashcards" as const, label: "Karteikarten", value: studySet.flashcards.length, unit: "Karten" },
    {
      id: "quiz" as const,
      label: "Quiz",
      value: studySet.quizQuestions.length + studySet.trueFalseQuestions.length + studySet.shortAnswerQuestions.length,
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
          <h2>{Object.keys(mastery).length} Themen erkannt</h2>
        </div>
        <div className="concept-list">
          {Object.entries(mastery).slice(0, 6).map(([concept, value]) => (
            <span key={concept}>{concept}<i style={{ width: `${value}%` }} /></span>
          ))}
        </div>
      </section>
    </div>
  );
}

