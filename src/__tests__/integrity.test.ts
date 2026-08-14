import { describe, expect, it } from "vitest";
import { dataset } from "../data";

describe("sky-quests.v1 integrity", () => {
  it("has 16 classes, 95 quests, 222 components, 95 runes", () => {
    const quests = dataset.classes.flatMap((c) => c.quests);
    const items = quests.flatMap((q) => q.items);
    expect(dataset.classes).toHaveLength(16);
    expect(quests).toHaveLength(95);
    expect(items).toHaveLength(222);
    expect(items.filter((i) => i.rune)).toHaveLength(95);
  });

  it("gives every quest exactly one wind rune", () => {
    for (const cls of dataset.classes) {
      for (const quest of cls.quests) {
        const runes = quest.items.filter((i) => i.rune);
        expect(runes, quest.id).toHaveLength(1);
        expect(runes[0].name.startsWith("Wind Rune ")).toBe(true);
      }
    }
  });

  it("does not invent drop rates", () => {
    const items = dataset.classes.flatMap((c) => c.quests.flatMap((q) => q.items));
    expect(items.every((i) => i.dropRate == null)).toBe(true);
  });

  it("flags known source conflicts instead of picking silently", () => {
    const items = dataset.classes.flatMap((c) => c.quests.flatMap((q) => q.items));
    const staff = items.filter((i) => i.name === "Efreeti Great Staff");
    const statue = items.filter((i) => i.name === "Efreeti Statuette");
    const gem = items.filter((i) => i.name === "Gem of Invigoration");
    expect(staff.every((i) => i.confidence === "conflict")).toBe(true);
    expect(statue.every((i) => i.confidence === "conflict")).toBe(true);
    expect(gem.every((i) => i.confidence === "unconfirmed")).toBe(true);
  });

  it("includes Beastlord and Berserker as EQL class lines", () => {
    expect(dataset.classes.map((c) => c.id)).toEqual([
      "BRD",
      "BST",
      "BER",
      "CLR",
      "DRU",
      "ENC",
      "MAG",
      "MNK",
      "NEC",
      "PAL",
      "RNG",
      "ROG",
      "SHD",
      "SHM",
      "WAR",
      "WIZ",
    ]);
  });
});
