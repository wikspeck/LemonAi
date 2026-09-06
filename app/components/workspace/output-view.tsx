"use client";

import { useState } from "react";

import { FlashcardsMode } from "@/app/components/modes/flashcards-mode";
import { LearnMode } from "@/app/components/modes/learn-mode";
import { NotesMode } from "@/app/components/modes/notes-mode";
import { QuizMode } from "@/app/components/modes/quiz-mode";
import { outputLabels } from "@/lib/workspace/output-meta";
import type { Flashcard, FlashcardRating, QuizAttempt, Workspace, WorkspaceOutput } from "@/lib/workspace/schema";

type OutputViewProps = {
  workspace: Workspace;
  output: WorkspaceOutput;
  onBack: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  onRate: (card: Flashcard, rating: FlashcardRating) => void;
  onMastery: (conceptId: string | null, delta: number) => void;
  onQuizComplete: (attempt: QuizAttempt) => void;
  onResetCards: (cards: Flashcard[]) => void;
};

export function OutputView({ workspace, output, onBack, onGenerate, onRate, onMastery, onQuizComplete, onResetCards }: OutputViewProps) {
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [studyMode, setStudyMode] = useState<"quiz" | "learn">("quiz");
  const latestAttempt = output.type === "quiz"
    ? [...workspace.progress.quizAttempts].reverse().find((attempt) => attempt.outputId === output.id)
    : undefined;

  const header = (
    <header className="output-titlebar">
      <button className="text-button" onClick={onBack}>← Alle Outputs</button>
      <div><p className="eyebrow">{outputLabels[output.type]} · {new Date(output.createdAt).toLocaleDateString("de-DE")}</p><h1>{output.title}</h1></div>
    </header>
  );

  if (output.type === "notes") return <>{header}<NotesMode title={output.title} notes={output.data.items} onGenerate={onGenerate} /></>;
  if (output.type === "flashcards") return <>{header}<div className="output-actions output-actions-spaced"><button className="outline-button" onClick={() => onResetCards(output.data.cards)}>Fortschritt zurücksetzen</button></div><FlashcardsMode flashcards={output.data.cards} ratings={workspace.progress.flashcardRatings} onRate={onRate} /></>;
  if (output.type === "quiz") return <>{header}<div className="output-actions output-actions-spaced"><button className={studyMode === "quiz" ? "primary-button" : "outline-button"} onClick={() => setStudyMode("quiz")}>Quiz</button>{output.data.quizzes.multipleChoice.length ? <button className={studyMode === "learn" ? "primary-button" : "outline-button"} onClick={() => setStudyMode("learn")}>Adaptiv lernen</button> : null}<button className="outline-button" onClick={() => onGenerate(`Erstelle eine schwierigere Version von „${output.title}“.`)}>Schwerer machen</button></div>{studyMode === "learn" && output.data.quizzes.multipleChoice.length ? <LearnMode concepts={workspace.concepts} quizzes={output.data.quizzes} mastery={workspace.progress.conceptMastery} onMasteryChange={onMastery} /> : <QuizMode outputId={output.id} quizzes={output.data.quizzes} latestAttempt={latestAttempt} onAnswer={onMastery} onComplete={onQuizComplete} />}</>;

  return (
    <>
      {header}
      {output.type === "summary" ? (
        <article className="prose-output"><p>{output.data.text}</p><div className="output-actions"><button className="outline-button" onClick={() => onGenerate(`Erstelle Karteikarten aus „${output.title}“.`)}>Karteikarten</button><button className="outline-button" onClick={() => onGenerate(`Erstelle ein Quiz aus „${output.title}“.`)}>Quiz erstellen</button></div></article>
      ) : null}
      {output.type === "explanation" ? (
        <article className="prose-output"><p>{output.data.text}</p><div className="output-actions"><button className="outline-button" onClick={() => onGenerate(`Erkläre „${output.title}“ noch einfacher.`)}>Einfacher</button><button className="outline-button" onClick={() => onGenerate(`Erkläre „${output.title}“ tiefer und detaillierter.`)}>Tiefer</button><button className="outline-button" onClick={() => onGenerate(`Teste mich zu „${output.title}“.`)}>Dazu testen</button></div></article>
      ) : null}
      {output.type === "timeline" ? (
        <section className="timeline-output">
          <div className="timeline-list">{output.data.events.map((event, index) => <button key={event.id} className={selectedEvent === index ? "active" : ""} onClick={() => setSelectedEvent(index)}><span>{event.date}</span><b>{event.title}</b></button>)}</div>
          <article><p className="eyebrow">{output.data.events[selectedEvent]?.date}</p><h2>{output.data.events[selectedEvent]?.title}</h2><p>{output.data.events[selectedEvent]?.description}</p><div className="output-actions"><button className="outline-button" onClick={() => onGenerate(`Teste mich zu den Daten aus „${output.title}“.`)}>Daten abfragen</button><button className="outline-button" onClick={() => onGenerate(`Erstelle Karteikarten aus „${output.title}“.`)}>Als Karten</button></div></article>
        </section>
      ) : null}
      {output.type === "comparison" ? (
        <div className="comparison-wrap"><table><thead><tr><th>Aspekt</th>{output.data.subjects.map((subject) => <th key={subject}>{subject}</th>)}</tr></thead><tbody>{output.data.rows.map((row) => <tr key={row.id}><th>{row.aspect}</th>{row.values.map((value, index) => <td key={`${row.id}-${output.data.subjects[index]}`}>{value}</td>)}</tr>)}</tbody></table><div className="output-actions"><button className="outline-button" onClick={() => onGenerate(`Erstelle ein Quiz aus dem Vergleich „${output.title}“.`)}>Vergleich testen</button></div></div>
      ) : null}
      {output.type === "keyTerms" ? (
        <dl className="key-terms">{output.data.terms.map((term) => <div key={term.id}><dt>{term.term}</dt><dd>{term.definition}</dd></div>)}</dl>
      ) : null}
    </>
  );
}
