import { describe, expect, it } from "vitest";
import { parseInventoryDump } from "../ingest/inventory";
import { normalizeName } from "../ingest/normalize";
import { DEMO_INVENTORY } from "../demo";

describe("inventory parser", () => {
  it("reads tab dumps, skips empty, uses Count", () => {
    const parsed = parseInventoryDump(DEMO_INVENTORY);
    expect(parsed.names.has(normalizeName("Light Woolen Mask"))).toBe(true);
    expect(parsed.names.has("empty")).toBe(false);
    expect(parsed.counts.get(normalizeName("Azure Ring"))).toBe(1);
    expect(parsed.skippedEmpty).toBeGreaterThan(0);
  });

  it("strips exaltation suffixes and curly quotes", () => {
    expect(normalizeName("Wind Rune Azia +5")).toBe("wind rune azia");
    expect(normalizeName("Fae Amulet (Exaltation)")).toBe("fae amulet");
    expect(normalizeName("Al`Kabor's Cap of Binding")).toBe("al'kabor's cap of binding");
  });
});
