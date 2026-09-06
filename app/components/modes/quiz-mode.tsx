"use client";

import { useMemo, useState } from "react";

import type { QuizAttempt, QuizCollection } from "@/lib/workspace/schema";

type Kind = keyof QuizCollection;
type Item = { id: string; prompt: string; answers: string[]; correct: string; accepted: string[]; explanation: string; conceptId: string | null };
const titles: Record<Kind, string> = { multipleChoice: "Multiple Choice", trueFalse: "Wahr / Falsch", shortAnswer: "Kurzantwort", fillBlank: "Lückentext" };
const normalize = (value: string) => value.toLocaleLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, " ");

type QuizModeProps = {
  outputId: string;
  quizzes: QuizCollection;
  latestAttempt?: QuizAttempt;
  onAnswer: (id: string | null, delta: number) => void;
  onComplete: (attempt: QuizAttempt) => void;
};

export function QuizMode({ outputId, quizzes, latestAttempt, onAnswer, onComplete }: QuizModeProps) {
  const available = (Object.keys(quizzes) as Kind[]).filter((kind) => quizzes[kind].length);
  const [kind, setKind] = useState<Kind>(available[0]);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [reviewIds, setReviewIds] = useState<string[] | null>(null);

  const items = useMemo<Item[]>(() => {
    if (kind === "multipleChoice") return quizzes.multipleChoice.map((question) => ({ id: question.id, prompt: question.question, answers: question.options, correct: question.correctAnswer, accepted: [question.correctAnswer], explanation: question.explanation, conceptId: question.conceptId }));
    if (kind === "trueFalse") return quizzes.trueFalse.map((question) => ({ id: question.id, prompt: question.statement, answers: ["Richtig", "Falsch"], correct: question.correctAnswer ? "Richtig" : "Falsch", accepted: [question.correctAnswer ? "Richtig" : "Falsch"], explanation: question.explanation, conceptId: question.conceptId }));
    if (kind === "shortAnswer") return quizzes.shortAnswer.map((question) => ({ id: question.id, prompt: question.question, answers: [], correct: question.expectedAnswer, accepted: question.acceptedAnswers, explanation: question.explanation, conceptId: question.conceptId }));
    return quizzes.fillBlank.map((question) => ({ id: question.id, prompt: question.sentence, answers: [], correct: question.answer, accepted: question.acceptedAnswers, explanation: question.explanation, conceptId: question.conceptId }));
  }, [kind, quizzes]);
  const session = reviewIds ? items.filter((item) => reviewIds.includes(item.id)) : items;
  const question = session[index];

  function reset(ids: string[] | null = null) {
    setIndex(0); setValue(""); setAnswered(false); setCorrect(false); setScore(0); setMistakes([]); setComplete(false); setReviewIds(ids);
  }
  function choose(next: Kind) { setKind(next); reset(); }
  function submit() {
    if (!value.trim() || answered) return;
    const answer = normalize(value);
    const isCorrect = question.accepted.some((candidate) => {
      const expected = normalize(candidate);
      return answer === expected || (answer.length > 8 && answer.includes(expected));
    });
    setCorrect(isCorrect); setAnswered(true);
    if (isCorrect) setScore((current) => current + 1);
    else setMistakes((current) => [...current, question.id]);
    onAnswer(question.conceptId, isCorrect ? 7 : -6);
  }
  function next() {
    if (index + 1 < session.length) { setIndex((current) => current + 1); setValue(""); setAnswered(false); return; }
    setComplete(true);
    onComplete({ id: crypto.randomUUID(), outputId, type: kind, score, total: session.length, incorrectIds: mistakes, completedAt: new Date().toISOString() });
  }
  function reviewPreviousMistakes() {
    if (!latestAttempt?.incorrectIds.length) return;
    setKind(latestAttempt.type); reset(latestAttempt.incorrectIds);
  }

  if (complete) return <div className="quiz-complete"><p className="eyebrow">Durchlauf beendet</p><strong>{Math.round((score / session.length) * 100)}<span>%</span></strong><h2>{score} von {session.length} richtig</h2><div className="adaptive-actions">{mistakes.length ? <button className="outline-button" onClick={() => reset(mistakes)}>Fehler wiederholen</button> : null}<button className="primary-button" onClick={() => reset()}>Quiz neu starten</button></div></div>;

  return (
    <div className="quiz-layout">
      <header className="quiz-header"><div><p className="eyebrow">Aktive Abfrage</p><h2>Prüfe dein Verständnis.</h2></div><div className="output-actions">{latestAttempt?.incorrectIds.length ? <button className="outline-button" onClick={reviewPreviousMistakes}>Letzte Fehler üben</button> : null}<div className="score-chip"><span>{score}</span> Punkte</div></div></header>
      <div className="quiz-type-tabs">{available.map((type) => <button key={type} className={kind === type ? "active" : ""} onClick={() => choose(type)}>{titles[type]}</button>)}</div>
      <div className="quiz-progress"><span>Aufgabe {index + 1} von {session.length}</span><i><b style={{ width: `${((index + 1) / session.length) * 100}%` }} /></i><span>{titles[kind]}</span></div>
      <section className="question-panel">
        <h3>{question.prompt}</h3>
        {question.answers.length ? <div className="answer-grid">{question.answers.map((answer, answerIndex) => <button key={answer} className={answered ? answer === question.correct ? "correct" : value === answer ? "incorrect" : "" : value === answer ? "selected" : ""} onClick={() => !answered && setValue(answer)}><span>{String.fromCharCode(65 + answerIndex)}</span>{answer}</button>)}</div> : <textarea className="quiz-text-answer" rows={4} value={value} disabled={answered} onChange={(event) => setValue(event.target.value)} placeholder="Deine Antwort …" />}
        {!answered ? <button className="primary-button quiz-submit" disabled={!value.trim()} onClick={submit}>Antwort prüfen</button> : <div className={`answer-feedback ${correct ? "correct" : "incorrect"}`}><div><strong>{correct ? "Richtig" : "Noch nicht ganz"}</strong>{!correct ? <span>Antwort: {question.correct}</span> : null}<p>{question.explanation}</p></div><button onClick={next}>{index + 1 === session.length ? "Ergebnis" : "Weiter"} →</button></div>}
      </section>
    </div>
  );
}
