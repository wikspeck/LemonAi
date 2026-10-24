import type { CSSProperties } from "react";

export function ChatIcon({ name, size = 18, style }: { name: "chevron" | "check" | "moon" | "sun" | "arrow" | "menu" | "plus"; size?: number; style?: CSSProperties }) {
  const paths = {
    chevron: <path d="m6 9 6 6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    moon: <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    arrow: <path d="M12 19V5m-6 6 6-6 6 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h11" />,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}>{paths[name]}</svg>;
}
