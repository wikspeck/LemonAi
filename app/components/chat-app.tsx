"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { chatModels, type Chat, type ChatMessage } from "@/lib/chat-models";
import { ChatMarkdown } from "./chat-markdown";
import { ChatIcon } from "./chat-icon";
import "./chat.css";

const KEY = "lemon.chats.v1";
const fresh = (): Chat => ({ id: crypto.randomUUID(), title: "Neuer Chat", model: chatModels[0].id, messages: [] });

export function ChatApp() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [picker, setPicker] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const modelTrigger = useRef<HTMLButtonElement>(null);
  const modelMenu = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const changed = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const active = chats.find((chat) => chat.id === activeId);
  const model = chatModels.find((item) => item.id === active?.model && item.available) ?? chatModels[0];

  useEffect(() => {
    const timer = setTimeout(() => {
      let saved: Chat[] = [];
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
        if (Array.isArray(raw)) saved = raw.filter((chat) => typeof chat.id === "string" && typeof chat.title === "string" && chatModels.some((model) => model.id === chat.model) && Array.isArray(chat.messages) && chat.messages.every((message: ChatMessage) => typeof message.id === "string" && typeof message.content === "string" && ["user", "assistant"].includes(message.role)));
      } catch { /* Keep malformed storage untouched until the next explicit change. */ }
      if (!saved.length) saved = [fresh()];
      setChats(saved); setActiveId(saved[0].id); setReady(true);
      try {
        const savedTheme = localStorage.getItem("lemon.theme");
        setTheme(savedTheme === "dark" || (savedTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
      } catch { /* The default theme works without browser storage. */ }
    }, 0);
    fetch("/api/chat").then((res) => res.json()).then((data) => setConnected(Boolean((data as { configured?: boolean }).configured))).catch(() => setConnected(false));
    return () => { clearTimeout(timer); abort.current?.abort(); };
  }, []);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [chats, busy]);

  useEffect(() => {
    if (picker) modelMenu.current?.querySelector<HTMLButtonElement>('button[aria-checked="true"]')?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && (picker || sidebar)) { setPicker(false); setSidebar(false); modelTrigger.current?.focus(); }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [picker, sidebar]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("lemon.theme", next); } catch { /* Apply for this session. */ }
  }

  useEffect(() => {
    if (!ready || !changed.current) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(chats)); }
      catch { setError("Der lokale Speicher ist voll. Diese Änderungen bleiben nur bis zum Neuladen erhalten."); }
    }, busy ? 300 : 0);
    return () => clearTimeout(timer);
  }, [chats, ready, busy]);

  function commit(update: (previous: Chat[]) => Chat[]) {
    changed.current = true;
    setChats(update);
  }
  function newChat() {
    if (busy) return;
    const chat = fresh(); commit((items) => [chat, ...items]); setActiveId(chat.id); setDraft(""); setError(""); setSidebar(false);
  }

  async function send() {
    if (!active || busy || !draft.trim()) return;
    const chatId = active.id;
    const text = draft.trim();
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const reply: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "", model: model.name };
    // An interrupted empty reply is never sent back as conversation context.
    const history = [...active.messages.filter((message) => message.content.trim()), user];
    commit((items) => items.map((chat) => chat.id === chatId ? { ...chat, title: chat.messages.length ? chat.title : text.slice(0, 48), messages: [...history, reply] } : chat));
    setDraft(""); setBusy(true); setError("");
    const controller = new AbortController(); abort.current = controller;
    let content = "";
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: model.id, messages: history.map(({ role, content }) => ({ role, content })) }) });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Die Nachricht konnte nicht gesendet werden.");
      if (!response.body) throw new Error("Keine Antwort empfangen.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") { finished = true; continue; }
          if (!data) continue;
          const event = JSON.parse(data);
          if (event.error) throw new Error("Das Modell hat die Antwort unterbrochen. Bitte versuche es erneut.");
          const delta = event.response ?? event.choices?.[0]?.delta?.content ?? (event.type === "content_block_delta" ? event.delta?.text : undefined);
          if (event.choices?.[0]?.finish_reason || event.type === "message_stop") finished = true;
          if (typeof delta === "string") {
            content += delta;
            commit((items) => items.map((chat) => chat.id === chatId ? { ...chat, messages: chat.messages.map((message) => message.id === reply.id ? { ...message, content } : message) } : chat));
          }
        }
        if (done) break;
      }
      if (!content) throw new Error("Das Modell hat keine Textantwort geliefert.");
      if (!finished) throw new Error("Die Antwort wurde unterbrochen. Der bisherige Text wurde gespeichert.");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Verbindungsfehler.");
      if (!content) {
        commit((items) => items.map((chat) => chat.id === chatId ? { ...chat, messages: active.messages } : chat));
        setDraft(text);
      }
    } finally { setBusy(false); abort.current = null; }
  }

  return <div className={`chat-app ${sidebar ? "sidebar-open" : ""}`} data-theme={theme}>
    {sidebar && <button className="sidebar-shade" aria-label="Menü schließen" onClick={() => setSidebar(false)} />}
    <aside className="chat-sidebar">
      <button className="chat-brand" onClick={newChat} disabled={busy}><Image src="/assets/lemonlogo.svg" width={28} height={28} alt="" /><span>lemon<span className="brand-dot">.</span></span></button>
      <button className="new-chat" onClick={newChat} disabled={busy}><ChatIcon name="plus" /> Neuer Chat</button>
      <p className="sidebar-label">DEINE CHATS</p>
      <nav className="chat-history" aria-label="Unterhaltungen">{chats.map((chat) => <div className={activeId === chat.id ? "selected" : ""} key={chat.id}><button disabled={busy} onClick={() => { setActiveId(chat.id); setError(""); setDraft(""); setSidebar(false); }}>{chat.title}</button><button disabled={busy} className="delete-chat" aria-label={`${chat.title} löschen`} onClick={() => { if (!confirm("Diesen Chat löschen?")) return; const remaining = chats.filter((item) => item.id !== chat.id); if (!remaining.length) remaining.push(fresh()); commit(() => remaining); if (chat.id === activeId) setActiveId(remaining[0].id); }}>×</button></div>)}</nav>
      <div className="sidebar-bottom"><div className="local-note"><span className="local-avatar">L</span><div>Dein persönlicher Raum<small>Chats auf diesem Gerät</small></div></div></div>
    </aside>
    <main className="chat-main">
      <header className="chat-header">
        <button className="mobile-menu" aria-label="Menü öffnen" onClick={() => setSidebar(true)}><ChatIcon name="menu" /></button>
        <div className="model-control">
          <button ref={modelTrigger} className="model-toggle" aria-label={`Modell wählen: ${model.name}`} aria-expanded={picker} aria-controls="model-menu" onClick={() => setPicker(!picker)}>{model.name}<ChatIcon name="chevron" size={16} style={{ transform: picker ? "rotate(180deg)" : undefined }} /></button>
          {picker && <><button className="picker-shade" aria-label="Modellauswahl schließen" onClick={() => { setPicker(false); modelTrigger.current?.focus(); }} /><div ref={modelMenu} id="model-menu" className="model-menu" role="dialog" aria-label="Modell wählen">
            <p className="model-menu-heading">Womit möchtest du denken?</p>
            <div role="radiogroup" aria-label="Verfügbare Modelle">{chatModels.filter((item) => item.available).map((item) => <button role="radio" aria-checked={model.id === item.id} key={item.id} disabled={busy} onClick={() => { commit((items) => items.map((chat) => chat.id === activeId ? { ...chat, model: item.id } : chat)); setPicker(false); modelTrigger.current?.focus(); }}><div className="model-option-title"><strong>{item.name}</strong>{model.id === item.id && <ChatIcon name="check" size={16} />}</div><span>{item.description}</span><small>{item.provider} · {item.context} Tokens Kontext</small></button>)}</div>
            <p className="model-menu-note">OpenAI & Anthropic sind ohne kostenpflichtigen Zugang nicht verfügbar.</p>
          </div></>}
        </div>
        <div className="header-actions"><span className="header-note">Ein Raum für deine Gedanken</span><button type="button" className="theme-toggle" aria-label={theme === "dark" ? "Hellen Modus aktivieren" : "Dunklen Modus aktivieren"} onClick={toggleTheme}><ChatIcon name={theme === "dark" ? "sun" : "moon"} /></button></div>
      </header>
      <section className={`conversation ${!active?.messages.length ? "is-empty" : ""}`} aria-label="Chatverlauf">
        {!active?.messages.length ? <div className="chat-welcome"><div className="welcome-mark"><Image src="/assets/lemonlogo.svg" width={45} height={45} alt="Lemon AI" /></div><p>WENIGER UMWEGE. MEHR IDEEN.</p><h1>Was geht dir durch den Kopf?</h1><span>Eine Frage, eine Idee oder einfach ein Anfang.</span></div> : <div className="message-list">{active.messages.map((message) => <article key={message.id} className={`chat-message ${message.role}`}><div className="message-label">{message.role === "user" ? "Du" : <><Image src="/assets/lemonlogo.svg" width={18} height={18} alt="" /> {message.model ?? "Lemon AI"}</>}</div><div className="message-content">{message.role === "assistant" && message.content ? <ChatMarkdown content={message.content} /> : message.content || (busy ? "Denkt nach …" : "Antwort angehalten.")}</div>{message.role === "assistant" && message.content && <button className="copy-message" onClick={() => navigator.clipboard.writeText(message.content).catch(() => setError("Kopieren ist in diesem Browser nicht verfügbar."))}>Kopieren</button>}</article>)}<div ref={end} /></div>}
      </section>
      <div className="chat-compose-area">{connected === false && <p className="connection-note">Cloudflare-Verbindung noch nicht eingerichtet. Deine Chats bleiben hier gespeichert.</p>}{error && <div className="chat-error" role="alert">{error}</div>}<form className="chat-compose" onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea autoFocus aria-label="Nachricht" placeholder="Frag Lemon …" value={draft} disabled={!ready || busy} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} /><div className="chat-compose-toolbar"><span>{model.provider} <i /> {model.context} Kontext</span>{busy ? <button type="button" className="send-chat" aria-label="Antwort stoppen" onClick={() => abort.current?.abort()}>■</button> : <button className="send-chat" disabled={!ready || !draft.trim()} aria-label="Nachricht senden"><ChatIcon name="arrow" /></button>}</div></form><p className="compose-footnote">Lemon AI kann Fehler machen. Prüfe wichtige Informationen.</p></div>
    </main>
  </div>;
}
