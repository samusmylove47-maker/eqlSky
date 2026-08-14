import { describe, expect, it } from "vitest";
import { applyLogEvents, parseLog } from "../ingest/log";
import { DEMO_LOG } from "../demo";
import { normalizeName } from "../ingest/normalize";

describe("log parser", () => {
  it("captures loot, sold, and give lines", () => {
    const events = parseLog(DEMO_LOG);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("loot");
    expect(kinds).toContain("give");
    expect(kinds).toContain("sold");
    const applied = applyLogEvents(events);
    expect(applied.have.has(normalizeName("Silver Hoop"))).toBe(true);
    expect(applied.have.has(normalizeName("Djinni War Blade"))).toBe(true);
    expect(applied.given.get(normalizeName("Clarisa Spiritsong"))).toEqual([
      normalizeName("Light Woolen Mask"),
      normalizeName("Wind Rune Meda"),
    ]);
  });
});
