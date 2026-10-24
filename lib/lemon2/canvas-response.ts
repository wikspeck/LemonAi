import { canvasSchema } from './contracts.ts';

const maximum = 1000000;
export function decodeCanvas(raw: unknown): { canvas?: ReturnType<typeof canvasSchema.parse>; text: string; original: string; reason?: string } {
  let original: string;
  try { original = typeof raw === 'string' ? raw : JSON.stringify(raw); } catch { original = ''; }
  if (!original || original.length > maximum) return { text: 'Die Antwort konnte nicht vollständig verarbeitet werden. Bitte erneut versuchen.', original: original?.slice(0, maximum) ?? '', reason: 'size-or-empty' };
  let candidate: unknown = raw;
  let prefix = ""; let suffix = "";
  if (typeof candidate === 'string') {
    const normalized = candidate.replace(/^\uFEFF/, '').trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1').trim();
    try { candidate = JSON.parse(normalized); } catch {
      candidate = normalized;
      const marker = normalized.indexOf('"components"');
      const beginning = marker >= 0 ? normalized.lastIndexOf('{', marker) : -1;
      if (beginning >= 0) {
        let depth = 0; let quoted = false; let escaped = false; let end = -1;
        for(let index = beginning; index < normalized.length; index++) {
          const char = normalized[index];
          if(quoted) { if(escaped) escaped=false; else if(char === '\\') escaped=true; else if(char === '"') quoted=false; }
          else if(char === '"') quoted=true;
          else if(char === '{' || char === '[') { if(++depth > 32) break; }
          else if(char === '}' || char === ']') { if(--depth === 0) { end=index+1; break; } }
        }
        prefix = normalized.slice(0, beginning).replace(/```json\s*$/i,'').trim();
        if(end > beginning) { try { candidate=JSON.parse(normalized.slice(beginning,end)); suffix=normalized.slice(end).replace(/^\s*```/,'').trim(); } catch { } }
      }
    }
  }
  if (candidate && typeof candidate === 'object' && 'canvas' in candidate) candidate = candidate.canvas;
  if(candidate && typeof candidate === 'object' && 'components' in candidate && Array.isArray(candidate.components) && (prefix || suffix)) {
    candidate = { ...candidate, components: [...(prefix ? [{type:'paragraph',text:prefix}] : []), ...candidate.components, ...(suffix ? [{type:'paragraph',text:suffix}] : [])] };
    prefix=''; suffix='';
  }
  const validated = canvasSchema.safeParse(candidate);
  if (validated.success) return { canvas: validated.data, text: '', original };
  const fragments: string[] = []; let visited = 0;
  function collect(value: unknown, depth = 0) {
    if (++visited > 256 || depth > 8 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.slice(0, 64).forEach(item => collect(item, depth + 1)); return; }
    for (const [name, child] of Object.entries(value)) {
      if (['text', 'title', 'label', 'content', 'markdown', 'message', 'caption'].includes(name) && typeof child === 'string' && child.trim()) fragments.push(child.slice(0, 12000));
      else if (['components', 'children', 'sections', 'items', 'canvas', 'response'].includes(name)) collect(child, depth + 1);
    }
  }
  if(prefix) fragments.push(prefix);
  collect(candidate);
  if (typeof candidate === 'string') {
    if (!/^\s*[{[]/.test(candidate) && !/"components"\s*:/.test(candidate)) return { text: candidate, original, reason: 'readable-text' };
    // Recover only fully quoted content fields from a truncated document, never evaluate code.
    for (const match of candidate.matchAll(/"(?:text|title|label|content|markdown)"\s*:\s*("(?:[^"\\]|\\.)*")/g)) {
      try { fragments.push(JSON.parse(match[1])); } catch { /* Incomplete strings stay internal. */ }
      if (fragments.length >= 64) break;
    }
  }
  if(suffix) fragments.push(suffix);
  return { text: [...new Set(fragments)].join('\n\n') || 'Diese Antwort konnte nicht als interaktive Ansicht dargestellt werden. Bitte erneut versuchen oder Markdown wählen.', original, reason: 'invalid-canvas' };
}
