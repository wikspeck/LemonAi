"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { StudyComposer } from "@/app/components/study-composer";
import { StudyWorkspace } from "@/app/components/study-workspace";
import { loadWorkspaces, saveWorkspaces } from "@/lib/workspace/storage";
import type { Workspace, WorkspaceSection } from "@/lib/workspace/schema";

const sectionLabels: Record<WorkspaceSection, string> = { overview: "Übersicht", sources: "Quellen", outputs: "Outputs", progress: "Fortschritt" };

export function LemonApp() {
  const [items, setItems] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [focus, setFocus] = useState(false);
  const [palette, setPalette] = useState(false);
  const active = useMemo(() => items.find((item) => item.id === activeId) ?? null, [items, activeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadWorkspaces();
      setItems(saved);
      setActiveId(saved[0]?.id ?? null);
      setCreating(!saved.length);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((value) => !value);
      }
      if (event.key === "Escape") {
        setPalette(false);
        setFocus(false);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  function commit(next: Workspace[]) {
    setItems(next);
    saveWorkspaces(next);
  }

  function update(workspace: Workspace) {
    commit([workspace, ...items.filter((item) => item.id !== workspace.id)]);
  }

  function open(id: string) {
    const selected = items.find((item) => item.id === id);
    if (!selected) return;
    setActiveId(id);
    setCreating(false);
    setFocus(false);
    commit([selected, ...items.filter((item) => item.id !== id)]);
  }

  function remove(id: string) {
    const next = items.filter((item) => item.id !== id);
    commit(next);
    if (activeId === id) {
      setActiveId(next[0]?.id ?? null);
      setCreating(!next.length);
    }
  }

  function beginNew() {
    setCreating(true);
    setFocus(false);
    setPalette(false);
  }

  function generated(workspace: Workspace) {
    commit([workspace, ...items]);
    setActiveId(workspace.id);
    setCreating(false);
  }

  function navigate(section: WorkspaceSection) {
    if (!active) return;
    update({ ...active, updatedAt: new Date().toISOString(), progress: { ...active.progress, lastSection: section, activeOutputId: null } });
    setPalette(false);
  }

  if (!hydrated) return <main className="app-loading" aria-label="Lemon AI wird geladen" />;

  return (
    <div className={`lemon-app ${focus ? "focus-mode" : ""}`}>
      <header className="topbar">
        <button className="wordmark" onClick={beginNew}><Image src="/assets/lemonlogo.svg" alt="" width={30} height={30} priority /><strong>Lemon AI</strong></button>
        <nav><button className={!creating && active ? "active" : ""} onClick={() => active && setCreating(false)}>Workspace</button><button className={creating || !active ? "active" : ""} onClick={beginNew}>Neu</button></nav>
        <div className="topbar-actions">{active && !creating ? <button className={`focus-toggle ${focus ? "active" : ""}`} onClick={() => setFocus((value) => !value)}>Fokus</button> : null}<button className="command-trigger" onClick={() => setPalette(true)}>Befehle <kbd>⌘ K</kbd></button></div>
      </header>

      {active && !creating ? <StudyWorkspace key={active.id} workspace={active} recent={items} focusMode={focus} onUpdate={update} onOpen={open} onDelete={remove} onNew={beginNew} /> : <main className="composer-page"><div className="composer-aside"><span>LEMON / NEU</span><p>Ein Thema bleibt. Quellen, Outputs und Fortschritt wachsen mit dir weiter.</p></div><StudyComposer onGenerated={generated} /></main>}

      {palette ? <div className="palette-backdrop" onMouseDown={() => setPalette(false)}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Schnellbefehle" onMouseDown={(event) => event.stopPropagation()}><header><Image src="/assets/lemonlogo.svg" alt="" width={22} height={22} /><strong>Schnellbefehle</strong></header><div>{active && !creating ? <><p>Workspace</p>{(Object.keys(sectionLabels) as WorkspaceSection[]).map((section) => <button key={section} onClick={() => navigate(section)}><span>{sectionLabels[section]}</span></button>)}<button onClick={() => { setFocus((value) => !value); setPalette(false); }}><span>Fokusmodus umschalten</span></button></> : null}<p>Allgemein</p><button onClick={beginNew}><span>Neuer Workspace</span></button></div></section></div> : null}
    </div>
  );
}
