import { outputCount, outputLabels } from "@/lib/workspace/output-meta";
import type { Workspace, WorkspaceSection } from "@/lib/workspace/schema";

type OverviewModeProps = {
  workspace: Workspace;
  onOpenOutput: (id: string) => void;
  onNavigate: (section: WorkspaceSection) => void;
};

export function OverviewMode({ workspace, onOpenOutput, onNavigate }: OverviewModeProps) {
  const masteryValues = Object.values(workspace.progress.conceptMastery);
  const mastery = masteryValues.length
    ? Math.round(masteryValues.reduce((sum, value) => sum + value, 0) / masteryValues.length)
    : 0;
  const weakConcepts = [...workspace.concepts]
    .sort((a, b) => (workspace.progress.conceptMastery[a.id] ?? 35) - (workspace.progress.conceptMastery[b.id] ?? 35))
    .slice(0, 3);
  const flashcards = [...workspace.outputs].reverse().find((output) => output.type === "flashcards");
  const quiz = [...workspace.outputs].reverse().find((output) => output.type === "quiz");

  return (
    <div className="workspace-overview">
      <section className="workspace-intro">
        <div><p className="eyebrow">Workspace</p><h1>{workspace.title}</h1></div>
        <dl>
          <div><dt>Quellen</dt><dd>{workspace.sources.length}</dd></div>
          <div><dt>Outputs</dt><dd>{workspace.outputs.length}</dd></div>
          <div><dt>Mastery</dt><dd>{mastery}%</dd></div>
        </dl>
      </section>

      <section className="continue-section">
        <div className="section-heading"><div><p className="eyebrow">Weiterlernen</p><h2>Der nächste sinnvolle Schritt.</h2></div></div>
        <div className="continue-actions">
          {flashcards ? <button onClick={() => onOpenOutput(flashcards.id)}><span>Karteikarten fortsetzen</span><b>{outputCount(flashcards)}</b></button> : null}
          {quiz ? <button onClick={() => onOpenOutput(quiz.id)}><span>Fehler üben</span><b>{workspace.progress.quizAttempts.at(-1)?.incorrectIds.length ?? 0} offen</b></button> : null}
          <button onClick={() => onNavigate("progress")}><span>Schwache Themen</span><b>{weakConcepts[0]?.name ?? "Noch keine"}</b></button>
        </div>
      </section>

      <section>
        <div className="section-heading"><div><p className="eyebrow">Outputs</p><h2>Deine Lernwerkzeuge.</h2></div><button className="text-button" onClick={() => onNavigate("outputs")}>Alle anzeigen →</button></div>
        <div className="output-grid">
          {[...workspace.outputs].reverse().slice(0, 6).map((output) => (
            <button key={output.id} className="output-card" onClick={() => onOpenOutput(output.id)}>
              <span>{outputLabels[output.type]}</span><h3>{output.title}</h3><p>{outputCount(output)}</p><i>Öffnen →</i>
            </button>
          ))}
        </div>
      </section>

      <div className="overview-columns">
        <section>
          <div className="section-heading"><div><p className="eyebrow">Schwache Themen</p><h2>Gezielt wiederholen.</h2></div></div>
          <div className="weak-list">
            {weakConcepts.map((concept) => <div key={concept.id}><span>{concept.name}</span><b>{workspace.progress.conceptMastery[concept.id] ?? 35}%</b><i><span style={{ width: `${workspace.progress.conceptMastery[concept.id] ?? 35}%` }} /></i></div>)}
          </div>
        </section>
        <section>
          <div className="section-heading"><div><p className="eyebrow">Aktivität</p><h2>Zuletzt passiert.</h2></div></div>
          <ol className="activity-list">
            {[...workspace.activity].reverse().slice(0, 5).map((activity) => <li key={activity.id}><span>{new Date(activity.createdAt).toLocaleDateString("de-DE")}</span>{activity.title}</li>)}
          </ol>
        </section>
      </div>
    </div>
  );
}
