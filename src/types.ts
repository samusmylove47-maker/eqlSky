export type DropKind = "zone-wide-trash" | "island-boss" | "efreeti-cycle" | "island-trash" | "unknown";
export type Confidence = "verified" | "cross-corroborated" | "conflict" | "unconfirmed";
export type QuestFilter = "all" | "needed" | "ready" | "rune";

export interface Island {
  id: string;
  number: string;
  name: string;
  boss: string;
  depth: number;
}

export interface QuestItem {
  id: string;
  name: string;
  aliases: string[];
  rune: boolean;
  qty: number;
  kind: DropKind;
  islands: string[];
  creatures: string[];
  confidence: Confidence;
  notes: string | null;
  dropRate: number | null;
  altCreatures: string[] | null;
}

export interface Reward {
  name: string;
  aliases: string[];
  slot: string;
  stats: string;
  haste: number | null;
}

export interface Quest {
  id: string;
  index: number;
  name: string;
  tester: string;
  say: string;
  sayConfidence: "verified" | "unverified";
  reward: Reward;
  island8: boolean;
  items: QuestItem[];
}

export interface SkyClass {
  id: string;
  name: string;
  hub: string;
  armor: string;
  verified: boolean;
  quests: Quest[];
}

export interface SharedItem {
  name: string;
  classIds: string[];
  questIds: string[];
}

export interface SkyDataset {
  version: number;
  generated: string;
  zone: string;
  zoneName: string;
  notes: Record<string, string>;
  islands: Island[];
  classes: SkyClass[];
  sharedItems: SharedItem[];
}

export type ItemState = "have" | "need";
export type QuestState = "need" | "needs-rune" | "ready" | "done";
