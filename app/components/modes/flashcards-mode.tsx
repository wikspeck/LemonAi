"use client";

import { useEffect, useState } from "react";

import type { Flashcard } from "@/lib/learning-material";

type FlashcardsModeProps = {
  flashcards: Flashcard[];
  onRate: (concept: string, rating: "easy" | "hard") => void;
};

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function FlashcardsMode({ flashcards, onRate }: FlashcardsModeProps) {
  const [deck, setDeck] = useState(flashcards);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<string, "easy" | "hard">>({});
  const card = deck[index];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % deck.length);
        setIsFlipped(false);
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + deck.length) % deck.length);
        setIsFlipped(false);
      }
      if (event.key === " " && target.tagName !== "BUTTON") {
        event.preventDefault();
        setIsFlipped((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deck.length]);

  function move(direction: -1 | 1) {
    setIndex((current) => (current + direction + deck.length) % deck.length);
    setIsFlipped(false);
  }

  function rate(rating: "easy" | "hard") {
    setRatings((current) => ({ ...current, [card.id]: rating }));
    onRate(card.concept, rating);
    move(1);
  }

  function shuffleDeck() {
    setDeck((current) => shuffled(current));
    setIndex(0);
    setIsFlipped(false);
  }

  return (
    <div className="flashcard-layout">
      <div className="flashcard-meta">
        <div>
          <p className="eyebrow">Aktive Wiederholung</p>
          <h2>Karteikarten</h2>
        </div>
        <button className="outline-button" onClick={shuffleDeck}>Mischen</button>
      </div>

      <div className="flashcard-progress">
        <span>{index + 1} / {deck.length}</span>
        <i><b style={{ width: `${((index + 1) / deck.length) * 100}%` }} /></i>
        <span>{Object.values(ratings).filter((rating) => rating === "hard").length} schwer</span>
      </div>

      <button
        className={`flashcard ${isFlipped ? "is-flipped" : ""}`}
        onClick={() => setIsFlipped((current) => !current)}
        aria-label={isFlipped ? "Antwort ausblenden" : "Antwort aufdecken"}
        aria-pressed={isFlipped}
      >
        <span className="card-concept">{card.concept}</span>
        <span className="card-side">{isFlipped ? "Antwort" : "Frage"}</span>
        <strong>{isFlipped ? card.back : card.front}</strong>
        <span className="reveal-hint">{isFlipped ? "Zum Zurückdrehen klicken" : "Klicken oder Leertaste zum Aufdecken"}</span>
      </button>

      <div className="flashcard-controls">
        <button className="icon-button" onClick={() => move(-1)} aria-label="Vorherige Karte">←</button>
        <div>
          <button className="rating-button hard" onClick={() => rate("hard")}>Noch schwer</button>
          <button className="rating-button easy" onClick={() => rate("easy")}>Sitzt</button>
        </div>
        <button className="icon-button" onClick={() => move(1)} aria-label="Nächste Karte">→</button>
      </div>

      <p className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> navigieren <kbd>Leertaste</kbd> aufdecken</p>
    </div>
  );
}
