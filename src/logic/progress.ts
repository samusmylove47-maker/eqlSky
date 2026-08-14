import { dataset } from "../data";
import { namesForItem, normalizeName } from "../ingest/normalize";
import type { Quest, QuestItem, QuestState, SkyClass } from "../types";

export interface ProgressInput {
  haveIds: Set<string>;
  doneIds: Set<string>;
  inventoryNames: Set<string>;
  logNames: Set<string>;
  currencyRunes: Set<string>;
  rewardNames: Set<string>;
}

export function itemOwned(item: QuestItem, p: ProgressInput): boolean {
  if (p.haveIds.has(item.id)) return true;
  const names = namesForItem(item.name, item.aliases);
  if (names.some((n) => p.inventoryNames.has(n) || p.logNames.has(n))) return true;
  if (item.rune && names.some((n) => p.currencyRunes.has(n))) return true;
  return false;
}

export function rewardOwned(quest: Quest, p: ProgressInput): boolean {
  const names = namesForItem(quest.reward.name, quest.reward.aliases);
  return names.some((n) => p.rewardNames.has(n) || p.inventoryNames.has(n));
}

export function questState(quest: Quest, p: ProgressInput): QuestState {
  if (p.doneIds.has(quest.id) || rewardOwned(quest, p)) return "done";
  const owned = quest.items.map((it) => itemOwned(it, p));
  if (owned.every(Boolean)) return "ready";
  const missing = quest.items.filter((_, i) => !owned[i]);
  if (missing.length > 0 && missing.every((it) => it.rune)) return "needs-rune";
  return "need";
}

export function classProgress(cls: SkyClass, p: ProgressInput): { done: number; total: number } {
  const done = cls.quests.filter((q) => questState(q, p) === "done").length;
  return { done, total: cls.quests.length };
}

export function shallowestIsland(item: QuestItem): string {
  let best = item.islands[0] ?? "any";
  let bestD = Infinity;
  for (const id of item.islands) {
    const row = dataset.islands.find((i) => i.id === id);
    const d = row?.depth ?? 99;
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

export function outstandingByIsland(
  classes: SkyClass[],
  p: ProgressInput
): Map<string, number> {
  const map = new Map<string, number>();
  for (const isl of dataset.islands) map.set(isl.id, 0);
  for (const cls of classes) {
    for (const quest of cls.quests) {
      if (questState(quest, p) === "done") continue;
      for (const item of quest.items) {
        if (itemOwned(item, p)) continue;
        const id = shallowestIsland(item);
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
  }
  return map;
}

export function sharedOpenUses(
  itemName: string,
  focusClassIds: string[],
  p: ProgressInput
): { classId: string; questId: string }[] {
  const key = normalizeName(itemName);
  const out: { classId: string; questId: string }[] = [];
  for (const cls of dataset.classes) {
    if (focusClassIds.length && !focusClassIds.includes(cls.id)) continue;
    for (const quest of cls.quests) {
      if (questState(quest, p) === "done") continue;
      if (quest.items.some((it) => normalizeName(it.name) === key && !itemOwned(it, p))) {
        out.push({ classId: cls.id, questId: quest.id });
      }
    }
  }
  return out;
}

export function matchesFilter(state: QuestState, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "needed") return state === "need" || state === "needs-rune";
  if (filter === "ready") return state === "ready";
  if (filter === "rune") return state === "needs-rune";
  return true;
}

export function questTouchesIsland(quest: Quest, islandId: string | null, p: ProgressInput): boolean {
  if (!islandId) return true;
  return quest.items.some((it) => !itemOwned(it, p) && it.islands.includes(islandId));
}
