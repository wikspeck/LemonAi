"use client";

import { useState } from "react";

import { FlashcardsMode } from "@/app/components/modes/flashcards-mode";
import { LearnMode } from "@/app/components/modes/learn-mode";
import { NotesMode } from "@/app/components/modes/notes-mode";
import { OverviewMode } from "@/app/components/modes/overview-mode";
import { QuizMode } from "@/app/components/modes/quiz-mode";
import type { ConceptMastery, StudySet } from "@/lib/learning-material";

export type WorkspaceTab = "overview" | "notes" | "flashcards" | "quiz" | "learn";

const tabs: Array<{ id: WorkspaceTab; label: string; key: string }> = [
  { id: "overview", label: "Übersicht", key: "1" },
  { id: "notes", label: "Notizen", key: "2" },
  { id: "flashcards", label: "Karteikarten", key: "3" },
  { id: "quiz", label: "Quiz", key: "4" },
  { id: "learn", label: "Lernen", key: "5" },
];

type StudyWorkspaceProps = {
  studySet: StudySet;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
};

function createInitialMastery(studySet: StudySet): ConceptMastery {
  const concepts = [
    ...studySet.flashcards.map((card) => card.concept),
    ...studySet.quizQuestions.map((question) => question.concept),
    ...studySet.trueFalseQuestions.map((question) => question.concept),
    ...studySet.shortAnswerQuestions.map((question) => question.concept),
  ];
  return Object.fromEntries([...new Set(concepts)].map((concept) => [concept, 40]));
}

export function StudyWorkspace({ studySet, activeTab, onTabChange }: StudyWorkspaceProps) {
  const [mastery, setMastery] = useState<ConceptMastery>(() => createInitialMastery(studySet));

  function adjustMastery(concept: string, delta: number) {
    setMastery((current) => ({
      ...current,
      [concept]: Math.max(0, Math.min(100, (current[concept] ?? 40) + delta)),
    }));
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-rail">
        <div className="rail-heading">
          <span>Aktives Set</span>
          <strong>{studySet.title}</strong>
        </div>
        <nav aria-label="Lernbereiche">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span><kbd>{tab.key}</kbd>
            </button>
          ))}
        </nav>
        <div className="rail-footer">
          <i />
          <div><strong>Sitzung aktiv</strong><span>Fortschritt lokal</span></div>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-titlebar">
          <div>
            <p className="eyebrow">Lernset</p>
            <h1>{studySet.title}</h1>
          </div>
          <div className="workspace-stats">
            <span><b>{studySet.flashcards.length}</b> Karten</span>
            <span><b>{studySet.quizQuestions.length + studySet.trueFalseQuestions.length + studySet.shortAnswerQuestions.length}</b> Fragen</span>
          </div>
        </header>

        <nav className="mobile-tabs" aria-label="Lernbereiche mobil">
          {tabs.map((tab) => (
            <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => onTabChange(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="workspace-content">
          {activeTab === "overview" ? <OverviewMode studySet={studySet} mastery={mastery} onNavigate={onTabChange} /> : null}
          {activeTab === "notes" ? <NotesMode studySet={studySet} /> : null}
          {activeTab === "flashcards" ? (
            <FlashcardsMode
              flashcards={studySet.flashcards}
              onRate={(concept, rating) => adjustMastery(concept, rating === "easy" ? 8 : -4)}
            />
          ) : null}
          {activeTab === "quiz" ? (
            <QuizMode
              multipleChoice={studySet.quizQuestions}
              trueFalse={studySet.trueFalseQuestions}
              shortAnswer={studySet.shortAnswerQuestions}
              onAnswer={(concept, correct) => adjustMastery(concept, correct ? 7 : -5)}
            />
          ) : null}
          {activeTab === "learn" ? (
            <LearnMode questions={studySet.quizQuestions} mastery={mastery} onMasteryChange={adjustMastery} />
          ) : null}
        </div>
      </main>
    </div>
  );
}
