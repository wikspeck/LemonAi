"use client";

import { useMemo, useState } from "react";

import type { ConceptMastery, QuizQuestion } from "@/lib/learning-material";

type LearnModeProps = {
  questions: QuizQuestion[];
  mastery: ConceptMastery;
  onMasteryChange: (concept: string, delta: number) => void;
};

const difficultyRank = { foundation: 0, application: 1, challenge: 2 } as const;

export function LearnMode({ questions, mastery, onMasteryChange }: LearnModeProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selection, setSelection] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [confidence, setConfidence] = useState(50);
  const [round, setRound] = useState(1);
  const question = questions[questionIndex];
  const isCorrect = selection === question.correctOptionIndex;

  const masteryEntries = useMemo(
    () => Object.entries(mastery).sort((a, b) => a[1] - b[1]),
    [mastery],
  );

  function answer(optionIndex: number) {
    if (answered) return;
    const correct = optionIndex === question.correctOptionIndex;
    setSelection(optionIndex);
    setAnswered(true);
    setCorrectStreak((current) => correct ? current + 1 : 0);
    onMasteryChange(question.concept, correct ? 10 : -8);
  }

  function chooseNext(forceChallenge = false) {
    const confidenceDelta = isCorrect
      ? Math.round((confidence - 50) / 10)
      : -Math.round(confidence / 25);
    onMasteryChange(question.concept, confidenceDelta);

    const targetDifficulty = forceChallenge ? 2 : correctStreak >= 2 ? 2 : correctStreak === 1 ? 1 : 0;
    const ranked = questions
      .map((candidate, index) => ({
        index,
        score:
          (mastery[candidate.concept] ?? 40) +
          Math.abs(difficultyRank[candidate.difficulty] - targetDifficulty) * 18 +
          (index === questionIndex ? 100 : 0),
      }))
      .sort((a, b) => a.score - b.score);

    setQuestionIndex(ranked[0]?.index ?? ((questionIndex + 1) % questions.length));
    setSelection(null);
    setAnswered(false);
    setConfidence(50);
    setRound((current) => current + 1);
  }

  const average = Math.round(
    masteryEntries.reduce((sum, [, value]) => sum + value, 0) / Math.max(masteryEntries.length, 1),
  );

  return (
    <div className="learn-layout">
      <aside className="mastery-panel">
        <div className="mastery-score">
          <p className="eyebrow">Konzept-Mastery</p>
          <strong>{average}<span>%</span></strong>
          <p>Passt sich nach jeder Antwort an.</p>
        </div>
        <div className="mastery-list">
          {masteryEntries.map(([concept, value]) => (
            <div key={concept}>
              <span>{concept}<b>{value}%</b></span>
              <i><b style={{ width: `${value}%` }} /></i>
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
          <div className="streak-mark"><span>{correctStreak}</span> Serie</div>
        </header>

        <div className="adaptive-question">
          <span>{question.concept}</span>
          <h2>{question.question}</h2>
          <div className="adaptive-options">
            {question.options.map((option, optionIndex) => {
              const correct = optionIndex === question.correctOptionIndex;
              const selected = optionIndex === selection;
              const state = answered ? (correct ? "correct" : selected ? "incorrect" : "") : "";
              return (
                <button key={option} className={state} disabled={answered} onClick={() => answer(optionIndex)}>
                  <span>{optionIndex + 1}</span>{option}
                </button>
              );
            })}
          </div>
        </div>

        {answered ? (
          <div className="adaptive-feedback">
            <div className="feedback-copy">
              <strong>{isCorrect ? "Sicher gelöst." : "Dieses Konzept kommt wieder."}</strong>
              <p>{question.explanation}</p>
            </div>
            <label>
              Wie sicher warst du?
              <span>{confidence}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={confidence}
                onChange={(event) => setConfidence(Number(event.target.value))}
              />
            </label>
            <div className="adaptive-actions">
              <button className="outline-button" onClick={() => chooseNext(true)}>Schwieriger</button>
              <button className="primary-button" onClick={() => chooseNext()}>Nächste Aufgabe →</button>
            </div>
          </div>
        ) : (
          <p className="adaptive-hint">Schwache Konzepte werden häufiger ausgewählt. Richtige Serien erhöhen die Schwierigkeit.</p>
        )}
      </section>
    </div>
  );
}
