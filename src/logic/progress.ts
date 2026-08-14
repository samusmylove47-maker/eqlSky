import { dataset } from "../data";
import { namesForItem, normalizeName } from "../ingest/normalize";
import type { Quest, QuestItem, QuestState, SkyClass } from "../types";

export interface ProgressInput {
  manualHave: Set<string>;
  manualNeed: Set<string>;
  doneIds: Set<string>;
  inventoryCounts: Record<string, number>;
  logNet: Record<string, number>;
  runeCounts: Record<string, number>;
  rewardNames: Set<string>;
}

export function itemNames(item: QuestItem): string[] {
  return namesForItem(item.name, item.aliases);
}

export function primaryName(item: QuestItem): string {
  return normalizeName(item.name);
}

export function poolCount(name: string, p: ProgressInput): number {
  const key = normalizeName(name);
  const inv = p.inventoryCounts[key] ?? 0;
  const log = p.logNet[key] ?? 0;
  const rune = p.runeCounts[key] ?? 0;
  return Math.max(inv, log) + rune;
}

export function claimantQuestIds(itemName: string, classes: SkyClass[], p: ProgressInput, pinnedFirst: string[]): string[] {
  const key = normalizeName(itemName);
  const pinned = new Set(pinnedFirst);
  const rows: { id: string; pin: number; classOrder: number; index: number }[] = [];
  classes.forEach((cls, ci) => {
    cls.quests.forEach((quest, qi) => {
      if (questDone(quest, p)) return;
      if (!quest.items.some((it) => normalizeName(it.name) === key)) return;
      rows.push({
        id: quest.id,
        pin: pinned.has(quest.id) ? 0 : 1,
        classOrder: ci,
        index: qi,
      });
    });
  });
  rows.sort((a, b) => a.pin - b.pin || a.classOrder - b.classOrder || a.index - b.index);
  return rows.map((r) => r.id);
}

export function itemOwned(item: QuestItem, quest: Quest, p: ProgressInput, classes: SkyClass[], pinnedFirst: string[]): boolean {
  if (p.manualNeed.has(item.id)) return false;
  if (p.manualHave.has(item.id)) return true;
  const pool = poolCount(item.name, p);
  if (pool <= 0) return false;
  const claimants = claimantQuestIds(item.name, classes, p, pinnedFirst);
  const idx = claimants.indexOf(quest.id);
  return idx >= 0 && idx < pool;
}

export function rewardOwned(quest: Quest, p: ProgressInput): boolean {
  const names = namesForItem(quest.reward.name, quest.reward.aliases);
  if (names.some((n) => p.rewardNames.has(n))) return true;
  return names.some((n) => (p.inventoryCounts[n] ?? 0) > 0);
}

export function questDone(quest: Quest, p: ProgressInput): boolean {
  return p.doneIds.has(quest.id) || rewardOwned(quest, p);
}

export function questState(quest: Quest, p: ProgressInput, classes: SkyClass[], pinnedFirst: string[]): QuestState {
  if (questDone(quest, p)) return "done";
  const owned = quest.items.map((it) => itemOwned(it, quest, p, classes, pinnedFirst));
  if (owned.every(Boolean)) return "ready";
  const missing = quest.items.filter((_, i) => !owned[i]);
  if (missing.length > 0 && missing.every((it) => it.rune)) return "needs-rune";
  return "need";
}

export function missingCount(quest: Quest, p: ProgressInput, classes: SkyClass[], pinnedFirst: string[]): number {
  if (questDone(quest, p)) return 0;
  return quest.items.filter((it) => !itemOwned(it, quest, p, classes, pinnedFirst)).length;
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

export function outstandingByIsland(classes: SkyClass[], p: ProgressInput, pinnedFirst: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const isl of dataset.islands) map.set(isl.id, 0);
  for (const cls of classes) {
    for (const quest of cls.quests) {
      if (questDone(quest, p)) continue;
      for (const item of quest.items) {
        if (itemOwned(item, quest, p, classes, pinnedFirst)) continue;
        const id = shallowestIsland(item);
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
  }
  return map;
}

export function islandNeeds(classes: SkyClass[], islandId: string, p: ProgressInput, pinnedFirst: string[]) {
  const rows: { cls: SkyClass; quest: Quest; item: QuestItem }[] = [];
  for (const cls of classes) {
    for (const quest of cls.quests) {
      if (questDone(quest, p)) continue;
      for (const item of quest.items) {
        if (!item.islands.includes(islandId)) continue;
        if (itemOwned(item, quest, p, classes, pinnedFirst)) continue;
        rows.push({ cls, quest, item });
      }
    }
  }
  return rows;
}

export function sharedOpenUses(
  item: QuestItem,
  classes: SkyClass[],
  p: ProgressInput
): { classId: string; questId: string }[] {
  if (item.rune) return [];
  const key = normalizeName(item.name);
  const out: { classId: string; questId: string }[] = [];
  for (const cls of classes) {
    for (const quest of cls.quests) {
      if (questDone(quest, p)) continue;
      if (quest.items.some((it) => !it.rune && normalizeName(it.name) === key)) {
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

export function questTouchesIsland(quest: Quest, islandId: string | null, p: ProgressInput, classes: SkyClass[], pinnedFirst: string[]): boolean {
  if (!islandId) return true;
  return quest.items.some((it) => it.islands.includes(islandId) && !itemOwned(it, quest, p, classes, pinnedFirst));
}
