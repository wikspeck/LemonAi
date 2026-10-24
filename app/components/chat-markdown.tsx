"use client";

import { Children, isValidElement, memo, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

function plainText(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? plainText(child.props.children) : "";
  }).join("");
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copyState, setCopyState] = useState("Code kopieren");
  const code = Children.toArray(children).find((child) => isValidElement(child));
  const className = isValidElement<{ className?: string }>(code) ? code.props.className : "";
  const language = className?.match(/language-([^\s]+)/)?.[1] ?? "Code";
  async function copy() {
    try { await navigator.clipboard.writeText(plainText(children).replace(/\n$/, "")); setCopyState("Kopiert"); }
    catch { setCopyState("Kopieren fehlgeschlagen"); }
  }
  return <div className="code-block"><div className="code-block-header"><span>{language}</span><button type="button" onClick={copy} aria-label={`${copyState} (${language})`}>{copyState}</button><span className="sr-only" role="status">{copyState === "Kopiert" ? "Code kopiert" : ""}</span></div><pre>{children}</pre></div>;
}

const components = {
  pre: CodeBlock,
  table: ({ children }: { children?: ReactNode }) => <div className="markdown-table" role="region" aria-label="Vergleichstabelle" tabIndex={0}><table>{children}</table></div>,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
};

export const ChatMarkdown = memo(function ChatMarkdown({ content }: { content: string }) {
  return <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: false }]]} components={components}>{content}</Markdown>;
});
