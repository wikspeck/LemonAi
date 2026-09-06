"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { StudyComposer } from "@/app/components/study-composer";
import { StudyWorkspace } from "@/app/components/study-workspace";
import { createProgress, loadWorkspaces, saveWorkspaces } from "@/lib/workspace/storage";
import type { StoredWorkspace, StudyWorkspace as Workspace, WorkspaceMode } from "@/lib/workspace/schema";

const labels: Record<WorkspaceMode, string> = { overview: "Übersicht", notes: "Notizen", flashcards: "Karteikarten", quiz: "Quiz", learn: "Lernen" };
function availableTabs(item: StoredWorkspace | null): WorkspaceMode[] {
  if (!item) return [];
  const { workspace } = item;
  const quizCount = Object.values(workspace.quizzes).reduce((sum, questions) => sum + questions.length, 0);
  return ["overview", ...(workspace.bulletPoints.length || workspace.summary || workspace.explanation ? ["notes" as const] : []), ...(workspace.flashcards.length ? ["flashcards" as const] : []), ...(quizCount ? ["quiz" as const] : []), ...(workspace.quizzes.multipleChoice.length ? ["learn" as const] : [])];
}

export function LemonApp() {
  const [items, setItems] = useState<StoredWorkspace[]>([]), [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false), [creating, setCreating] = useState(false), [focus, setFocus] = useState(false), [palette, setPalette] = useState(false);
  const active = useMemo(() => items.find((item) => item.workspace.id === activeId) ?? null, [items, activeId]);
  useEffect(() => { const timer = window.setTimeout(() => { const saved = loadWorkspaces(); setItems(saved); setActiveId(saved[0]?.workspace.id ?? null); setHydrated(true); }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { const keydown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPalette((v) => !v); return; } if (event.key === "Escape") { setPalette(false); setFocus(false); return; } const target = event.target as HTMLElement; const tab = availableTabs(active)[Number(event.key) - 1]; if (active && tab && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) updateMode(tab); }; window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown); });
  function commit(next: StoredWorkspace[]) { setItems(next); saveWorkspaces(next); }
  function update(item: StoredWorkspace) { commit([item, ...items.filter((x) => x.workspace.id !== item.workspace.id)]); }
  function updateMode(mode: WorkspaceMode) { if (active) update({ ...active, progress: { ...active.progress, lastMode: mode } }); }
  function open(id: string) { const selected = items.find((x) => x.workspace.id === id); if (!selected) return; setActiveId(id); setCreating(false); setFocus(false); commit([selected, ...items.filter((x) => x.workspace.id !== id)]); }
  function remove(id: string) { const next = items.filter((x) => x.workspace.id !== id); commit(next); if (activeId === id) { setActiveId(next[0]?.workspace.id ?? null); setCreating(!next.length); } }
  function beginNew() { setCreating(true); setFocus(false); setPalette(false); }
  function generated(workspace: Workspace) { const item = { workspace, progress: createProgress(workspace) }; commit([item, ...items]); setActiveId(workspace.id); setCreating(false); }
  if (!hydrated) return <main className="app-loading" aria-label="Lemon AI wird geladen" />;
  return <div className={`lemon-app ${focus ? "focus-mode" : ""}`}>
    <header className="topbar"><button className="wordmark" onClick={beginNew}><Image src="/assets/lemonlogo.svg" alt="" width={30} height={30} priority /><strong>Lemon AI</strong></button><nav><button className={!creating && active ? "active" : ""} onClick={() => active && setCreating(false)}>Workspace</button><button className={creating || !active ? "active" : ""} onClick={beginNew}>Neu</button></nav><div className="topbar-actions">{active && !creating ? <button className={`focus-toggle ${focus ? "active" : ""}`} onClick={() => setFocus((v) => !v)}>Fokus</button> : null}<button className="command-trigger" onClick={() => setPalette(true)}>Befehle <kbd>⌘ K</kbd></button></div></header>
    {active && !creating ? <StudyWorkspace stored={active} recent={items} focusMode={focus} onUpdate={update} onOpen={open} onDelete={remove} onNew={beginNew} /> : <main className="composer-page"><div className="composer-aside"><span>LEMON / 01</span><p>Aus Rohmaterial wird ein Arbeitsraum zum Verstehen, Prüfen und Wiederholen.</p></div><StudyComposer onGenerated={generated} /></main>}
    {palette ? <div className="palette-backdrop" onMouseDown={() => setPalette(false)}><section className="command-palette" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><header><Image src="/assets/lemonlogo.svg" alt="" width={22} height={22} /><input autoFocus placeholder="Befehl suchen …" /></header><div><p>Navigation</p>{active && !creating ? availableTabs(active).map((tab, i) => <button key={tab} onClick={() => { updateMode(tab); setPalette(false); }}><span>{labels[tab]}</span><kbd>{i + 1}</kbd></button>) : null}<p>Workspace</p>{active && !creating ? <button onClick={() => { setFocus((v) => !v); setPalette(false); }}><span>Fokusmodus umschalten</span></button> : null}<button onClick={beginNew}><span>Neuer Workspace</span></button></div></section></div> : null}
  </div>;
}
