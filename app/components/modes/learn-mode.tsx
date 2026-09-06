"use client";

import { useMemo, useState } from "react";

import type { Concept, MultipleChoiceQuestion, QuizCollection } from "@/lib/workspace/schema";

type Confidence = "guess" | "unsure" | "confident";

type LearnModeProps = {
  concepts: Concept[];
  quizzes: QuizCollection;
  mastery: Record<string, number>;
  onMasteryChange: (id: string | null, delta: number) => void;
};

export function LearnMode({ concepts: sourceConcepts, quizzes, mastery, onMasteryChange }: LearnModeProps) {
  const questions = quizzes.multipleChoice;
  const [question, setQuestion] = useState<MultipleChoiceQuestion>(questions[0]);
  const [selection, setSelection] = useState("");
  const [confidence, setConfidence] = useState<Confidence>("unsure");
  const [answered, setAnswered] = useState(false);
  const [round, setRound] = useState(1);
  const correct = selection === question.correctAnswer;
  const concepts = useMemo(
    () => [...sourceConcepts].sort((a, b) => (mastery[a.id] ?? 35) - (mastery[b.id] ?? 35)),
    [sourceConcepts, mastery],
  );

  function check() {
    if (!selection) return;
    setAnswered(true);
    onMasteryChange(
      question.conceptId,
      correct ? confidence === "confident" ? 14 : confidence === "unsure" ? 8 : 5 : -10,
    );
  }

  function next() {
    const ranked = questions
      .map((candidate) => ({
        candidate,
        score: candidate.conceptId ? mastery[candidate.conceptId] ?? 35 : 50,
        random: Math.random() * 20,
      }))
      .filter(({ candidate }) => candidate.id !== question.id)
      .sort((a, b) => a.score + a.random - b.score - b.random);
    setQuestion(ranked[0]?.candidate ?? questions[(questions.indexOf(question) + 1) % questions.length]);
    setSelection("");
    setAnswered(false);
    setConfidence("unsure");
    setRound((current) => current + 1);
  }

  const average = Math.round(
    Object.values(mastery).reduce((sum, value) => sum + value, 0) /
    Math.max(Object.keys(mastery).length, 1),
  );

  return (
    <div className="learn-layout">
      <aside className="mastery-panel">
        <div className="mastery-score">
          <p className="eyebrow">Konzept-Mastery</p>
          <strong>{average}<span>%</span></strong>
          <p>Schwache Themen erscheinen häufiger.</p>
        </div>
        <div className="mastery-list">
          {concepts.map((concept) => (
            <div key={concept.id}>
              <span>{concept.name}<b>{mastery[concept.id] ?? 35}%</b></span>
              <i><b style={{ width: `${mastery[concept.id] ?? 35}%` }} /></i>
            </div>
          ))}
        </div>
      </aside>
      <section className="adaptive-panel">
        <header>
          <div>
            <p className="eyebrow">Adaptiver Durchlauf · {String(round).padStart(2, "0")}</p>
            <span className={`difficulty-tag ${question.difficulty}`}>{question.difficulty}</span>
          </div>
        </header>
        <div className="adaptive-question">
          <span>{sourceConcepts.find((concept) => concept.id === question.conceptId)?.name ?? "Kernkonzept"}</span>
          <h2>{question.question}</h2>
          <div className="adaptive-options">
            {question.options.map((option, index) => (
              <button
                key={option}
                disabled={answered}
                className={answered ? option === question.correctAnswer ? "correct" : selection === option ? "incorrect" : "" : selection === option ? "selected" : ""}
                onClick={() => setSelection(option)}
              >
                <span>{index + 1}</span>{option}
              </button>
            ))}
          </div>
        </div>
        <div className="confidence-input">
          <span>Wie sicher bist du?</span>
          {(["guess", "unsure", "confident"] as Confidence[]).map((level) => (
            <button key={level} className={confidence === level ? "active" : ""} disabled={answered} onClick={() => setConfidence(level)}>
              {level === "guess" ? "Geraten" : level === "unsure" ? "Unsicher" : "Sicher"}
            </button>
          ))}
        </div>
        {answered ? (
          <div className="adaptive-feedback">
            <div className="feedback-copy"><strong>{correct ? "Richtig." : "Dieses Konzept kommt wieder."}</strong><p>{question.explanation}</p></div>
            <button className="primary-button" onClick={next}>Nächste Aufgabe →</button>
          </div>
        ) : <button className="primary-button learn-submit" disabled={!selection} onClick={check}>Antwort prüfen</button>}
      </section>
    </div>
  );
}
