import raw from "../data/sky-quests.v1.json";
import type { SkyClass, SkyDataset, Quest, QuestItem } from "./types";

export const dataset = raw as SkyDataset;

export const classById = new Map(dataset.classes.map((c) => [c.id, c]));
export const questById = new Map<string, { cls: SkyClass; quest: Quest }>();
export const itemById = new Map<string, { cls: SkyClass; quest: Quest; item: QuestItem }>();

for (const cls of dataset.classes) {
  for (const quest of cls.quests) {
    questById.set(quest.id, { cls, quest });
    for (const item of quest.items) {
      itemById.set(item.id, { cls, quest, item });
    }
  }
}

export const islandById = new Map(dataset.islands.map((i) => [i.id, i]));

export function kindLabel(kind: QuestItem["kind"]): string {
  switch (kind) {
    case "zone-wide-trash":
      return "zone-wide trash";
    case "island-boss":
      return "boss drop";
    case "efreeti-cycle":
      return "efreeti cycle";
    case "island-trash":
      return "island trash";
    default:
      return "source unpublished";
  }
}

export function islandTag(ids: string[]): string {
  if (ids.includes("any") && ids.length === 1) return "I—";
  if (ids.length === 3 && ids.includes("1.5") && ids.includes("4") && ids.includes("8")) {
    return "I1.5/4/8";
  }
  return ids.map((id) => (id === "any" ? "zone" : `I${id}`)).join(",");
}

export function creatureLine(item: QuestItem): string {
  const names = item.creatures.join(" · ");
  const island = islandTag(item.islands);
  const kind = kindLabel(item.kind);
  const rate = item.dropRate != null ? ` · ${item.dropRate}%` : "";
  return `${names} · ${island} · ${kind}${rate}`;
}
