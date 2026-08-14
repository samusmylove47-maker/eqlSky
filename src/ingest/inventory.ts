import { normalizeName } from "./normalize";

export interface InventoryStack {
  name: string;
  normalized: string;
  count: number;
  location: string;
}

export interface InventoryParse {
  stacks: InventoryStack[];
  counts: Map<string, number>;
  names: Set<string>;
  lineCount: number;
  skippedEmpty: number;
}

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  if (line.includes("|")) return line.split("|").map((c) => c.trim());
  return [line.trim()];
}

export function parseInventoryDump(text: string): InventoryParse {
  const lines = text.split(/\r?\n/);
  let nameIdx = -1;
  let countIdx = -1;
  let locIdx = -1;
  let headerSeen = false;
  const stacks: InventoryStack[] = [];
  let skippedEmpty = 0;

  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, "");
    if (!line.trim()) continue;
    const cols = splitRow(line);
    const lower = cols.map((c) => c.toLowerCase());
    if (!headerSeen && lower.some((c) => c === "name")) {
      headerSeen = true;
      nameIdx = lower.indexOf("name");
      countIdx = lower.findIndex((c) => c === "count" || c === "qty" || c === "quantity");
      locIdx = lower.findIndex((c) => c === "location" || c === "slot" || c === "loc");
      continue;
    }
    const name = nameIdx >= 0 ? cols[nameIdx] : cols.length > 1 ? cols[1] : cols[0];
    if (!name || /^empty$/i.test(name)) {
      skippedEmpty += 1;
      continue;
    }
    const countRaw = countIdx >= 0 ? cols[countIdx] : "";
    const count = Math.max(1, parseInt(countRaw, 10) || 1);
    const location = locIdx >= 0 ? cols[locIdx] || "" : "";
    stacks.push({
      name,
      normalized: normalizeName(name),
      count,
      location,
    });
  }

  const counts = new Map<string, number>();
  for (const s of stacks) {
    counts.set(s.normalized, (counts.get(s.normalized) ?? 0) + s.count);
  }
  return {
    stacks,
    counts,
    names: new Set(counts.keys()),
    lineCount: stacks.length,
    skippedEmpty,
  };
}
