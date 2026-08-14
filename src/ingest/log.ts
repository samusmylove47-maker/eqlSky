import { namesForItem, normalizeName } from "./normalize";

export type LogEventKind = "loot" | "sold" | "destroyed" | "give" | "offer" | "xp" | "other";

export interface LogEvent {
  kind: LogEventKind;
  item: string;
  normalized: string;
  npc?: string;
  raw: string;
}

function strip(s: string): string {
  return s
    .replace(/\.+$/, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/^(?:an?|the)\s+/i, "")
    .trim();
}

function body(line: string): string {
  return line.replace(/^\[[^\]]+\]\s*/, "").replace(/^--+/, "").replace(/--+$/, "").trim();
}

const LOOT = /^(?:you have looted|you loot|--you have looted)\s+(?:an?\s+)?(.+?)(?:\s+from\b.*)?(?:\.|--)?$/i;
const SOLD = /^you (?:sold|sell)\s+(?:an?\s+)?(.+?)(?:\s+for\b.*)?\.?$/i;
const DESTROYED = /^you (?:destroyed|destroy)\s+(?:an?\s+)?(.+?)\.?$/i;
const GIVE_TO = /^you (?:give|have given)\s+(?:an?\s+)?(.+?)\s+to\s+(.+?)\.?$/i;
const GIVE_NPC_ITEM = /^you give\s+(.+?)\s+(?:an?\s+)(.+?)\.?$/i;
const OFFER = /^you offer\s+(?:an?\s+)?(.+?)\s+to\s+(.+?)\.?$/i;
const XP = /^you gain (?:party )?experience/i;

export function parseLogLine(line: string): LogEvent | null {
  const cleaned = body(line);
  if (!cleaned) return null;
  if (XP.test(cleaned)) return { kind: "xp", item: "", normalized: "", raw: line };
  let m = cleaned.match(LOOT);
  if (m) return { kind: "loot", item: strip(m[1]), normalized: normalizeName(m[1]), raw: line };
  m = cleaned.match(SOLD);
  if (m) return { kind: "sold", item: strip(m[1]), normalized: normalizeName(m[1]), raw: line };
  m = cleaned.match(DESTROYED);
  if (m) return { kind: "destroyed", item: strip(m[1]), normalized: normalizeName(m[1]), raw: line };
  m = cleaned.match(OFFER);
  if (m) {
    return { kind: "offer", item: strip(m[1]), normalized: normalizeName(m[1]), npc: strip(m[2]), raw: line };
  }
  m = cleaned.match(GIVE_TO);
  if (m) {
    return { kind: "give", item: strip(m[1]), normalized: normalizeName(m[1]), npc: strip(m[2]), raw: line };
  }
  m = cleaned.match(GIVE_NPC_ITEM);
  if (m && !/ to /i.test(cleaned)) {
    return { kind: "give", item: strip(m[2]), normalized: normalizeName(m[2]), npc: strip(m[1]), raw: line };
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

export function applyLogEvents(events: LogEvent[]): {
  net: Record<string, number>;
  given: Map<string, string[]>;
  offers: Map<string, string[]>;
  xpAfterGive: Set<string>;
} {
  const net: Record<string, number> = {};
  const given = new Map<string, string[]>();
  const offers = new Map<string, string[]>();
  const xpAfterGive = new Set<string>();
  let lastGiveNpc = "";
  const bump = (k: string, d: number) => {
    net[k] = Math.max(0, (net[k] ?? 0) + d);
  };
  for (const ev of events) {
    if (ev.kind === "loot") bump(ev.normalized, 1);
    if (ev.kind === "sold" || ev.kind === "destroyed") bump(ev.normalized, -1);
    if (ev.kind === "offer" && ev.npc) {
      const npc = normalizeName(ev.npc);
      const list = offers.get(npc) ?? [];
      list.push(ev.normalized);
      offers.set(npc, list);
    }
    if (ev.kind === "give" && ev.npc) {
      bump(ev.normalized, -1);
      const npc = normalizeName(ev.npc);
      const list = given.get(npc) ?? [];
      list.push(ev.normalized);
      given.set(npc, list);
      lastGiveNpc = npc;
    }
    if (ev.kind === "xp" && lastGiveNpc) {
      xpAfterGive.add(lastGiveNpc);
      lastGiveNpc = "";
    }
  }
  return { net, given, offers, xpAfterGive };
}

export function testerMatches(tester: string, npc: string): boolean {
  return normalizeName(tester) === normalizeName(npc) || normalizeName(tester).includes(normalizeName(npc)) || normalizeName(npc).includes(normalizeName(tester));
}

export { namesForItem };
