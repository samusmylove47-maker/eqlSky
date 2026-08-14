import { describe, expect, it } from "vitest";
import { questById } from "../data";
import { itemOwned, questState, type ProgressInput } from "../logic/progress";

function empty(): ProgressInput {
  return {
    haveIds: new Set(),
    doneIds: new Set(),
    inventoryNames: new Set(),
    logNames: new Set(),
    currencyRunes: new Set(),
    rewardNames: new Set(),
  };
}

describe("quest states", () => {
  const tone = questById.get("BRD:test-of-tone")!.quest;

  it("does not mark done just because bags are full", () => {
    const p = empty();
    p.haveIds = new Set(tone.items.map((i) => i.id));
    expect(questState(tone, p)).toBe("ready");
  });

  it("marks needs-rune when only the rune is missing", () => {
    const p = empty();
    const named = tone.items.find((i) => !i.rune)!;
    p.haveIds.add(named.id);
    expect(questState(tone, p)).toBe("needs-rune");
  });

  it("marks done from reward in inventory or explicit done", () => {
    const byReward = empty();
    byReward.rewardNames.add("mask of song");
    expect(questState(tone, byReward)).toBe("done");
    const byFlag = empty();
    byFlag.doneIds.add(tone.id);
    expect(questState(tone, byFlag)).toBe("done");
  });

  it("counts currency-tab runes as owned", () => {
    const p = empty();
    const rune = tone.items.find((i) => i.rune)!;
    p.currencyRunes.add("wind rune meda");
    expect(itemOwned(rune, p)).toBe(true);
  });
});
