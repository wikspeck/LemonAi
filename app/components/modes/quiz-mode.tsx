"use client";

import { useMemo, useState, type FormEvent } from "react";

import type {
  QuizQuestion,
  ShortAnswerQuestion,
  TrueFalseQuestion,
} from "@/lib/learning-material";

type QuizModeProps = {
  multipleChoice: QuizQuestion[];
  trueFalse: TrueFalseQuestion[];
  shortAnswer: ShortAnswerQuestion[];
  onAnswer: (concept: string, correct: boolean) => void;
};

type SessionQuestion =
  | { type: "choice"; id: string; concept: string; prompt: string; options: string[]; correct: string; explanation: string }
  | { type: "boolean"; id: string; concept: string; prompt: string; correct: string; explanation: string }
  | { type: "short"; id: string; concept: string; prompt: string; accepted: string[]; expected: string; explanation: string };

function normalize(value: string) {
  return value.toLocaleLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, " ");
}

export function QuizMode({ multipleChoice, trueFalse, shortAnswer, onAnswer }: QuizModeProps) {
  const questions = useMemo<SessionQuestion[]>(() => [
    ...multipleChoice.map((question) => ({
      type: "choice" as const,
      id: question.id,
      concept: question.concept,
      prompt: question.question,
      options: question.options,
      correct: question.options[question.correctOptionIndex],
      explanation: question.explanation,
    })),
    ...trueFalse.map((question) => ({
      type: "boolean" as const,
      id: question.id,
      concept: question.concept,
      prompt: question.statement,
      correct: String(question.answer),
      explanation: question.explanation,
    })),
    ...shortAnswer.map((question) => ({
      type: "short" as const,
      id: question.id,
      concept: question.concept,
      prompt: question.question,
      accepted: question.acceptedAnswers,
      expected: question.expectedAnswer,
      explanation: question.explanation,
    })),
  ], [multipleChoice, trueFalse, shortAnswer]);

  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState("");
  const [shortResponse, setShortResponse] = useState("");
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const question = questions[index];

  function commitAnswer(correct: boolean, value: string) {
    if (answered) return;
    setSelection(value);
    setWasCorrect(correct);
    setAnswered(true);
    if (correct) setScore((current) => current + 1);
    onAnswer(question.concept, correct);
  }

  function submitShortAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question.type !== "short" || !shortResponse.trim()) return;
    const answer = normalize(shortResponse);
    const correct = question.accepted.some((accepted) => {
      const normalizedAccepted = normalize(accepted);
      return answer === normalizedAccepted || answer.includes(normalizedAccepted);
    });
    commitAnswer(correct, shortResponse);
  }

  function nextQuestion() {
    if (index === questions.length - 1) {
      setComplete(true);
      return;
    }
    setIndex((current) => current + 1);
    setSelection("");
    setShortResponse("");
    setAnswered(false);
  }

  function restart() {
    setIndex(0);
    setSelection("");
    setShortResponse("");
    setAnswered(false);
    setWasCorrect(false);
    setScore(0);
    setComplete(false);
  }

  if (complete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz-complete">
        <p className="eyebrow">Durchlauf beendet</p>
        <strong>{percentage}<span>%</span></strong>
        <h2>{score} von {questions.length} richtig</h2>
        <p>{percentage >= 80 ? "Sehr sicher. Zeit für den adaptiven Lernmodus." : "Guter Anfang. Schwierige Konzepte werden im Lernmodus wiederholt."}</p>
        <button className="primary-button" onClick={restart}>Quiz neu starten</button>
      </div>
    );
  }

  const options = question.type === "choice"
    ? question.options
    : question.type === "boolean"
      ? ["true", "false"]
      : [];

  return (
    <div className="quiz-layout">
      <header className="quiz-header">
        <div>
          <p className="eyebrow">Gemischter Test</p>
          <h2>Prüfe dein Verständnis.</h2>
        </div>
        <div className="score-chip"><span>{score}</span> Punkte</div>
      </header>

      <div className="quiz-progress">
        <span>Aufgabe {index + 1} von {questions.length}</span>
        <i><b style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></i>
        <span>{question.type === "choice" ? "Multiple Choice" : question.type === "boolean" ? "Wahr / Falsch" : "Kurzantwort"}</span>
      </div>

      <section className="question-panel">
        <span className="question-concept">{question.concept}</span>
        <h3>{question.prompt}</h3>

        {question.type !== "short" ? (
          <div className="answer-grid">
            {options.map((option, optionIndex) => {
              const label = question.type === "boolean" ? (option === "true" ? "Richtig" : "Falsch") : option;
              const correct = option === question.correct;
              const selected = option === selection;
              const state = answered ? (correct ? "correct" : selected ? "incorrect" : "") : "";
              return (
                <button
                  key={option}
                  className={state}
                  onClick={() => commitAnswer(correct, option)}
                  disabled={answered}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>{label}
                </button>
              );
            })}
          </div>
        ) : (
          <form className="short-answer-form" onSubmit={submitShortAnswer}>
            <textarea
              value={shortResponse}
              onChange={(event) => setShortResponse(event.target.value)}
              placeholder="Formuliere deine Antwort in eigenen Worten …"
              disabled={answered}
              rows={4}
            />
            {!answered ? <button disabled={!shortResponse.trim()}>Antwort prüfen</button> : null}
          </form>
        )}

        {answered ? (
          <div className={`answer-feedback ${wasCorrect ? "correct" : "incorrect"}`}>
            <div>
              <strong>{wasCorrect ? "Richtig" : "Noch nicht ganz"}</strong>
              {question.type === "short" && !wasCorrect ? <span>Musterantwort: {question.expected}</span> : null}
              <p>{question.explanation}</p>
            </div>
            <button onClick={nextQuestion}>{index === questions.length - 1 ? "Ergebnis" : "Weiter"} →</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
