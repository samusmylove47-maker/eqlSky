import { normalizeName } from "./normalize";

export type LogEventKind = "loot" | "sold" | "destroyed" | "give" | "other";

export interface LogEvent {
  kind: LogEventKind;
  item: string;
  normalized: string;
  npc?: string;
  raw: string;
}

const LOOT =
  /(?:you have looted|you loot|--you have looted)\s+(?:an?\s+)?(.+?)(?:\s+from\b.*)?(?:\.|--)?$/i;
const SOLD = /you (?:sold|sell)\s+(?:an?\s+)?(.+?)(?:\s+for\b.*)?\.?$/i;
const DESTROYED = /you (?:destroyed|destroy)\s+(?:an?\s+)?(.+?)\.?$/i;
const GIVE = /you give\s+(.+?)\s+to\s+(.+?)\.?$/i;

function strip(s: string): string {
  return s.replace(/\.+$/, "").replace(/^-+/, "").replace(/-+$/, "").trim();
}

export function parseLogLine(line: string): LogEvent | null {
  const cleaned = line.replace(/^\[[^\]]+\]\s*/, "").trim();
  if (!cleaned) return null;
  let m = cleaned.match(LOOT);
  if (m) {
    return { kind: "loot", item: strip(m[1]), normalized: normalizeName(m[1]), raw: line };
  }
  m = cleaned.match(SOLD);
  if (m) {
    return { kind: "sold", item: strip(m[1]), normalized: normalizeName(m[1]), raw: line };
  }
  m = cleaned.match(DESTROYED);
  if (m) {
    return { kind: "destroyed", item: strip(m[1]), normalized: normalizeName(m[1]), raw: line };
  }
  m = cleaned.match(GIVE);
  if (m) {
    return {
      kind: "give",
      item: strip(m[1]),
      normalized: normalizeName(m[1]),
      npc: strip(m[2]),
      raw: line,
    };
  }
  return null;
}

export function parseLog(text: string): LogEvent[] {
  const out: LogEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    const ev = parseLogLine(line);
    if (ev) out.push(ev);
  }
  return out;
}

export function applyLogEvents(events: LogEvent[]): { have: Set<string>; given: Map<string, string[]> } {
  const have = new Set<string>();
  const given = new Map<string, string[]>();
  for (const ev of events) {
    if (ev.kind === "loot") have.add(ev.normalized);
    if (ev.kind === "sold" || ev.kind === "destroyed") have.delete(ev.normalized);
    if (ev.kind === "give") {
      have.delete(ev.normalized);
      const npc = normalizeName(ev.npc || "");
      const list = given.get(npc) ?? [];
      list.push(ev.normalized);
      given.set(npc, list);
    }
  }
  return { have, given };
}
