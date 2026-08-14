/** Inventory / log name matching. Never treat +N exaltation or lore wrappers as a different item. */
export function normalizeName(raw: string): string {
  return String(raw)
    .replace(/[`’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s*\+\d+\s*$/g, "")
    .trim()
    .toLowerCase();
}

export function namesForItem(name: string, aliases: string[] = []): string[] {
  return [name, ...aliases].map(normalizeName);
}
