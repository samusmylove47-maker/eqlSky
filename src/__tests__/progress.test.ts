import { describe, expect, it } from "vitest";
import { dataset, questById } from "../data";
import { itemOwned, questState, type ProgressInput } from "../logic/progress";

function empty(): ProgressInput {
  return {
    manualHave: new Set(),
    manualNeed: new Set(),
    doneIds: new Set(),
    inventoryCounts: {},
    logNet: {},
    runeCounts: {},
    rewardNames: new Set(),
  };
}

describe("quest states", () => {
  const tone = questById.get("BRD:test-of-tone")!.quest;
  const classes = dataset.classes;
  const pins: string[] = [];

  it("does not mark done just because bags are full", () => {
    const p = empty();
    for (const it of tone.items) p.inventoryCounts[it.name.toLowerCase()] = 1;
    p.inventoryCounts["light woolen mask"] = 1;
    p.inventoryCounts["wind rune meda"] = 1;
    expect(questState(tone, p, classes, pins)).toBe("ready");
  });

  it("marks needs-rune when only the rune is missing", () => {
    const p = empty();
    p.inventoryCounts["light woolen mask"] = 1;
    expect(questState(tone, p, classes, pins)).toBe("needs-rune");
  });

  it("marks done from reward in inventory or explicit done", () => {
    const byReward = empty();
    byReward.rewardNames.add("mask of song");
    expect(questState(tone, byReward, classes, pins)).toBe("done");
    const byFlag = empty();
    byFlag.doneIds.add(tone.id);
    expect(questState(tone, byFlag, classes, pins)).toBe("done");
  });

  it("counts currency-tab runes as owned", () => {
    const p = empty();
    const rune = tone.items.find((i) => i.rune)!;
    p.runeCounts["wind rune meda"] = 1;
    expect(itemOwned(rune, tone, p, classes, pins)).toBe(true);
  });

  it("allocates a shared stack to the first open claimant only", () => {
    const p = empty();
    p.inventoryCounts["djinni war blade"] = 1;
    const ber = questById.get("BER:test-of-sharpness")!.quest;
    const war = questById.get("WAR:test-of-smash")!.quest;
    const blade = (q: typeof ber) => q.items.find((i) => i.name === "Djinni War Blade")!;
    expect(itemOwned(blade(ber), ber, p, classes, ["BER:test-of-sharpness", "WAR:test-of-smash"])).toBe(true);
    expect(itemOwned(blade(war), war, p, classes, ["BER:test-of-sharpness", "WAR:test-of-smash"])).toBe(false);
  });
});
