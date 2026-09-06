"use client";

import { useEffect, useState } from "react";

import type { Flashcard, FlashcardRating } from "@/lib/workspace/schema";

type FlashcardsModeProps = {
  flashcards: Flashcard[];
  ratings: Record<string, FlashcardRating>;
  onRate: (card: Flashcard, rating: FlashcardRating) => void;
};

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function FlashcardsMode({ flashcards, ratings, onRate }: FlashcardsModeProps) {
  const [deck, setDeck] = useState(flashcards);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [weakOnly, setWeakOnly] = useState(false);
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

  function rate(rating: FlashcardRating) {
    onRate(card, rating);
    if (rating === "again" || rating === "hard") {
      setDeck((current) => [...current, card]);
    }
    move(1);
  }

  function shuffleDeck() {
    const source = weakOnly
      ? flashcards.filter((item) => ["again", "hard"].includes(ratings[item.id] ?? ""))
      : flashcards;
    setDeck(shuffled(source.length ? source : flashcards));
    setIndex(0);
    setIsFlipped(false);
  }

  function toggleWeakCards() {
    const next = !weakOnly;
    const weakCards = flashcards.filter((item) => ["again", "hard"].includes(ratings[item.id] ?? ""));
    setWeakOnly(next);
    setDeck(next && weakCards.length ? weakCards : flashcards);
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
        <div className="flashcard-tools">
          <button className={`outline-button ${weakOnly ? "active" : ""}`} onClick={toggleWeakCards}>Schwache Karten</button>
          <button className="outline-button" onClick={shuffleDeck}>Mischen</button>
        </div>
      </div>

      <div className="flashcard-progress">
        <span>{index + 1} / {deck.length}</span>
        <i><b style={{ width: `${((index + 1) / deck.length) * 100}%` }} /></i>
        <span>{Object.values(ratings).filter((rating) => rating === "again" || rating === "hard").length} schwach</span>
      </div>

      <button
        className={`flashcard ${isFlipped ? "is-flipped" : ""}`}
        onClick={() => setIsFlipped((current) => !current)}
        aria-label={isFlipped ? "Antwort ausblenden" : "Antwort aufdecken"}
        aria-pressed={isFlipped}
      >
        <span className="card-concept">{card.conceptId ? "Konzeptkarte" : "Lernkarte"}</span>
        <span className="card-side">{isFlipped ? "Antwort" : "Frage"}</span>
        <strong>{isFlipped ? card.back : card.front}</strong>
        <span className="reveal-hint">{isFlipped ? "Zum Zurückdrehen klicken" : "Klicken oder Leertaste zum Aufdecken"}</span>
      </button>

      <div className="flashcard-controls">
        <button className="icon-button" onClick={() => move(-1)} aria-label="Vorherige Karte">←</button>
        <div>
          <button className="rating-button again" onClick={() => rate("again")}>Nochmal</button>
          <button className="rating-button hard" onClick={() => rate("hard")}>Schwer</button>
          <button className="rating-button good" onClick={() => rate("good")}>Gut</button>
          <button className="rating-button easy" onClick={() => rate("easy")}>Einfach</button>
        </div>
        <button className="icon-button" onClick={() => move(1)} aria-label="Nächste Karte">→</button>
      </div>

      <p className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> navigieren <kbd>Leertaste</kbd> aufdecken</p>
    </div>
  );
}
