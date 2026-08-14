import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dataset, questById } from "../data";
import { DEMO_INVENTORY, DEMO_LOG } from "../demo";
import { parseInventoryDump } from "../ingest/inventory";
import { applyLogEvents, parseLog } from "../ingest/log";
import { namesForItem, normalizeName } from "../ingest/normalize";
import { itemOwned, questState, type ProgressInput } from "./progress";
import type { QuestFilter } from "../types";

const RUNE_NAMES = [
  "Azia",
  "Beza",
  "Caza",
  "Dena",
  "Ena",
  "Fana",
  "Geza",
  "Heda",
  "Izah",
  "Jaka",
  "Kala",
  "Lena",
  "Meda",
  "Neza",
  "Ozah",
];

export const WIND_RUNES = RUNE_NAMES.map((n) => `Wind Rune ${n}`);

export interface SkyState {
  characterName: string;
  trio: string[];
  showAllClasses: boolean;
  pinnedQuestIds: string[];
  overlayItemIds: Record<string, string[]>;
  haveIds: string[];
  doneIds: string[];
  currencyRunes: string[];
  inventoryNames: string[];
  logNames: string[];
  lastInventoryNote: string;
  lastLogNote: string;
  filter: QuestFilter;
  islandFilter: string | null;
  overlayVisible: boolean;
  overlayLocked: boolean;
  overlayOpacity: number;
  overlayScale: number;
  overlayPopout: boolean;
  overlayPos: { x: number; y: number };
  overlaySize: { w: number; h: number };
  demo: boolean;
  setName: (n: string) => void;
  toggleTrio: (id: string) => void;
  clearTrio: () => void;
  setShowAll: (v: boolean) => void;
  setFilter: (f: QuestFilter) => void;
  setIsland: (id: string | null) => void;
  pinQuest: (questId: string) => void;
  toggleOverlayItem: (questId: string, itemId: string) => void;
  toggleHave: (itemId: string) => void;
  toggleDone: (questId: string) => void;
  toggleRune: (name: string) => void;
  setAllRunes: (on: boolean) => void;
  importInventory: (text: string) => void;
  importLog: (text: string) => void;
  setOverlayVisible: (v: boolean) => void;
  setOverlayLocked: (v: boolean) => void;
  setOpacity: (n: number) => void;
  setScale: (n: number) => void;
  setOverlayPopout: (v: boolean) => void;
  setOverlayPos: (p: { x: number; y: number }) => void;
  setOverlaySize: (s: { w: number; h: number }) => void;
  loadDemo: () => void;
  resetProgress: () => void;
}

function defaultOverlayItems(questId: string, p: ProgressInput): string[] {
  const row = questById.get(questId);
  if (!row) return [];
  if (questState(row.quest, p) === "done") return [];
  return row.quest.items.filter((it) => !itemOwned(it, p)).map((it) => it.id);
}

function progressFrom(s: {
  haveIds: string[];
  doneIds: string[];
  inventoryNames: string[];
  logNames: string[];
  currencyRunes: string[];
}): ProgressInput {
  return {
    haveIds: new Set(s.haveIds),
    doneIds: new Set(s.doneIds),
    inventoryNames: new Set(s.inventoryNames),
    logNames: new Set(s.logNames),
    currencyRunes: new Set(s.currencyRunes.map(normalizeName)),
    rewardNames: new Set(s.inventoryNames),
  };
}

export function selectProgress(s: SkyState): ProgressInput {
  return progressFrom(s);
}

export const useSky = create<SkyState>()(
  persist(
    (set, get) => ({
      characterName: "",
      trio: [],
      showAllClasses: true,
      pinnedQuestIds: [],
      overlayItemIds: {},
      haveIds: [],
      doneIds: [],
      currencyRunes: [],
      inventoryNames: [],
      logNames: [],
      lastInventoryNote: "",
      lastLogNote: "",
      filter: "all",
      islandFilter: null,
      overlayVisible: true,
      overlayLocked: false,
      overlayOpacity: 88,
      overlayScale: 100,
      overlayPopout: false,
      overlayPos: { x: 24, y: 72 },
      overlaySize: { w: 360, h: 520 },
      demo: false,
      setName: (n) => set({ characterName: n.slice(0, 24) }),
      toggleTrio: (id) =>
        set((s) => {
          const has = s.trio.includes(id);
          const trio = has ? s.trio.filter((x) => x !== id) : s.trio.length < 3 ? [...s.trio, id] : s.trio;
          return { trio, showAllClasses: trio.length !== 3 };
        }),
      clearTrio: () => set({ trio: [], showAllClasses: true }),
      setShowAll: (v) => set({ showAllClasses: v }),
      setFilter: (f) => set({ filter: f }),
      setIsland: (id) => set((s) => ({ islandFilter: s.islandFilter === id ? null : id })),
      pinQuest: (questId) =>
        set((s) => {
          const pinned = s.pinnedQuestIds.includes(questId);
          if (pinned) {
            const overlayItemIds = { ...s.overlayItemIds };
            delete overlayItemIds[questId];
            return { pinnedQuestIds: s.pinnedQuestIds.filter((id) => id !== questId), overlayItemIds };
          }
          const p = progressFrom(s);
          return {
            pinnedQuestIds: [...s.pinnedQuestIds, questId],
            overlayItemIds: { ...s.overlayItemIds, [questId]: defaultOverlayItems(questId, p) },
          };
        }),
      toggleOverlayItem: (questId, itemId) =>
        set((s) => {
          const cur = s.overlayItemIds[questId] ?? [];
          const next = cur.includes(itemId) ? cur.filter((id) => id !== itemId) : [...cur, itemId];
          return { overlayItemIds: { ...s.overlayItemIds, [questId]: next } };
        }),
      toggleHave: (itemId) =>
        set((s) => ({
          haveIds: s.haveIds.includes(itemId) ? s.haveIds.filter((id) => id !== itemId) : [...s.haveIds, itemId],
        })),
      toggleDone: (questId) =>
        set((s) => ({
          doneIds: s.doneIds.includes(questId) ? s.doneIds.filter((id) => id !== questId) : [...s.doneIds, questId],
        })),
      toggleRune: (name) =>
        set((s) => {
          const n = normalizeName(name);
          const on = s.currencyRunes.map(normalizeName).includes(n);
          return {
            currencyRunes: on
              ? s.currencyRunes.filter((x) => normalizeName(x) !== n)
              : [...s.currencyRunes, name],
          };
        }),
      setAllRunes: (on) => set({ currencyRunes: on ? [...WIND_RUNES] : [] }),
      importInventory: (text) =>
        set((s) => {
          const parsed = parseInventoryDump(text);
          const names = [...parsed.names];
          const haveIds = new Set(s.haveIds);
          let matched = 0;
          for (const cls of dataset.classes) {
            for (const quest of cls.quests) {
              for (const item of quest.items) {
                if (namesForItem(item.name, item.aliases).some((n) => parsed.names.has(n))) {
                  haveIds.add(item.id);
                  matched += 1;
                }
              }
            }
          }
          return {
            inventoryNames: names,
            haveIds: [...haveIds],
            lastInventoryNote: `${matched} turn-in rows matched from ${parsed.lineCount} dump lines. Wind runes in currency are not in this file.`,
          };
        }),
      importLog: (text) =>
        set((s) => {
          const events = parseLog(text);
          const applied = applyLogEvents(events);
          const haveIds = new Set(s.haveIds);
          let lootHits = 0;
          for (const cls of dataset.classes) {
            for (const quest of cls.quests) {
              for (const item of quest.items) {
                const names = namesForItem(item.name, item.aliases);
                if (names.some((n) => applied.have.has(n))) {
                  haveIds.add(item.id);
                  lootHits += 1;
                }
              }
            }
          }
          const doneIds = new Set(s.doneIds);
          for (const cls of dataset.classes) {
            for (const quest of cls.quests) {
              const tester = normalizeName(quest.tester);
              const given = applied.given.get(tester) ?? [];
              const need = quest.items.map((it) => namesForItem(it.name, it.aliases));
              const allGiven = need.every((aliases) => aliases.some((n) => given.includes(n)));
              if (allGiven && need.length > 0) doneIds.add(quest.id);
            }
          }
          return {
            logNames: [...applied.have],
            haveIds: [...haveIds],
            doneIds: [...doneIds],
            lastLogNote: `${events.length} parsed lines · ${lootHits} quest-item loot hits. Done is only marked on a full give-to-tester match.`,
          };
        }),
      setOverlayVisible: (v) => set({ overlayVisible: v }),
      setOverlayLocked: (v) => set({ overlayLocked: v }),
      setOpacity: (n) => set({ overlayOpacity: Math.min(100, Math.max(20, n)) }),
      setScale: (n) => set({ overlayScale: Math.min(140, Math.max(75, n)) }),
      setOverlayPopout: (v) => set({ overlayPopout: v }),
      setOverlayPos: (p) => set({ overlayPos: p }),
      setOverlaySize: (sz) => set({ overlaySize: sz }),
      loadDemo: () => {
        get().resetProgress();
        set({
          characterName: "Demo",
          trio: ["BRD", "CLR", "WAR"],
          showAllClasses: false,
          demo: true,
          overlayVisible: true,
          overlayLocked: false,
          overlayOpacity: 88,
          currencyRunes: ["Wind Rune Lena"],
          filter: "all",
          islandFilter: null,
        });
        get().importInventory(DEMO_INVENTORY);
        get().importLog(DEMO_LOG);
        const pin = ["BRD:test-of-tone", "BRD:test-of-pitch", "CLR:test-of-courage", "WAR:test-of-smash"];
        for (const id of pin) get().pinQuest(id);
        set({ lastInventoryNote: "Demo dump loaded. Hoard was open. Currency-tab runes are not in the file." });
      },
      resetProgress: () =>
        set({
          pinnedQuestIds: [],
          overlayItemIds: {},
          haveIds: [],
          doneIds: [],
          currencyRunes: [],
          inventoryNames: [],
          logNames: [],
          lastInventoryNote: "",
          lastLogNote: "",
          demo: false,
        }),
    }),
    { name: "eqlsky.v1" }
  )
);

export function visibleClasses(s: SkyState) {
  if (!s.showAllClasses && s.trio.length === 3) {
    return dataset.classes.filter((c) => s.trio.includes(c.id));
  }
  return dataset.classes;
}
