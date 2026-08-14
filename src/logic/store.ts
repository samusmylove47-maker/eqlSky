import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dataset, questById } from "../data";
import { DEMO_INVENTORY, DEMO_LOG } from "../demo";
import { parseInventoryDump } from "../ingest/inventory";
import { applyLogEvents, parseLog, testerMatches } from "../ingest/log";
import { namesForItem, normalizeName } from "../ingest/normalize";
import { watchTextFile, type Watcher } from "../ingest/watch";
import {
  itemOwned,
  missingCount,
  questDone,
  questState,
  type ProgressInput,
} from "./progress";
import type { QuestFilter } from "../types";

export const WIND_RUNES = [
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
].map((n) => `Wind Rune ${n}`);

let logWatch: Watcher | null = null;
let invWatch: Watcher | null = null;

export interface SkyState {
  characterName: string;
  serverName: string;
  trio: string[];
  showAllClasses: boolean;
  expandedQuestIds: string[];
  pinnedQuestIds: string[];
  overlayItemIds: Record<string, string[]>;
  showObtained: boolean;
  manualHave: string[];
  manualNeed: string[];
  doneIds: string[];
  runeCounts: Record<string, number>;
  inventoryCounts: Record<string, number>;
  logNet: Record<string, number>;
  lastInventoryNote: string;
  lastLogNote: string;
  watchingLog: string;
  watchingInv: string;
  filter: QuestFilter;
  islandFilter: string | null;
  search: string;
  sortClosest: boolean;
  overlayVisible: boolean;
  overlayLocked: boolean;
  overlayOpacity: number;
  overlayScale: number;
  overlayPopout: boolean;
  overlayPos: { x: number; y: number };
  overlaySize: { w: number; h: number };
  demo: boolean;
  hydrated: boolean;
  setHydrated: () => void;
  setName: (n: string) => void;
  setServer: (n: string) => void;
  toggleTrio: (id: string) => void;
  clearTrio: () => void;
  setShowAll: (v: boolean) => void;
  setFilter: (f: QuestFilter) => void;
  setIsland: (id: string | null) => void;
  setSearch: (q: string) => void;
  setSortClosest: (v: boolean) => void;
  toggleExpand: (questId: string) => void;
  pinQuest: (questId: string) => void;
  toggleOverlayItem: (questId: string, itemId: string) => void;
  toggleHave: (itemId: string) => void;
  toggleDone: (questId: string) => void;
  cycleRune: (name: string) => void;
  setAllRunes: (n: number) => void;
  importInventory: (text: string) => void;
  importLog: (text: string, incremental?: boolean) => void;
  watchLog: () => Promise<void>;
  watchInventory: () => Promise<void>;
  stopWatches: () => void;
  setOverlayVisible: (v: boolean) => void;
  setOverlayLocked: (v: boolean) => void;
  setOpacity: (n: number) => void;
  setScale: (n: number) => void;
  setOverlayPopout: (v: boolean) => void;
  setOverlayPos: (p: { x: number; y: number }) => void;
  setOverlaySize: (s: { w: number; h: number }) => void;
  setShowObtained: (v: boolean) => void;
  loadDemo: () => void;
  resetProgress: () => void;
}

function progressFrom(s: {
  manualHave: string[];
  manualNeed: string[];
  doneIds: string[];
  inventoryCounts: Record<string, number>;
  logNet: Record<string, number>;
  runeCounts: Record<string, number>;
}): ProgressInput {
  const rewardNames = new Set<string>();
  for (const [k, n] of Object.entries(s.inventoryCounts)) if (n > 0) rewardNames.add(k);
  return {
    manualHave: new Set(s.manualHave),
    manualNeed: new Set(s.manualNeed),
    doneIds: new Set(s.doneIds),
    inventoryCounts: s.inventoryCounts,
    logNet: s.logNet,
    runeCounts: Object.fromEntries(Object.entries(s.runeCounts).map(([k, v]) => [normalizeName(k), v])),
    rewardNames,
  };
}

export function selectProgress(s: SkyState): ProgressInput {
  return progressFrom(s);
}

function neededOverlayItems(questId: string, s: Parameters<typeof progressFrom>[0] & { pinnedQuestIds: string[] }): string[] {
  const row = questById.get(questId);
  if (!row) return [];
  const p = progressFrom(s);
  if (questDone(row.quest, p)) return [];
  return row.quest.items
    .filter((it) => !itemOwned(it, row.quest, p, dataset.classes, s.pinnedQuestIds))
    .map((it) => it.id);
}

export const useSky = create<SkyState>()(
  persist(
    (set, get) => ({
      characterName: "",
      serverName: "",
      trio: [],
      showAllClasses: true,
      expandedQuestIds: [],
      pinnedQuestIds: [],
      overlayItemIds: {},
      showObtained: false,
      manualHave: [],
      manualNeed: [],
      doneIds: [],
      runeCounts: {},
      inventoryCounts: {},
      logNet: {},
      lastInventoryNote: "",
      lastLogNote: "",
      watchingLog: "",
      watchingInv: "",
      filter: "all",
      islandFilter: null,
      search: "",
      sortClosest: true,
      overlayVisible: false,
      overlayLocked: false,
      overlayOpacity: 88,
      overlayScale: 100,
      overlayPopout: false,
      overlayPos: { x: 24, y: 72 },
      overlaySize: { w: 340, h: 480 },
      demo: false,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setName: (n) => set({ characterName: n.slice(0, 24) }),
      setServer: (n) => set({ serverName: n.slice(0, 24) }),
      toggleTrio: (id) =>
        set((s) => {
          const has = s.trio.includes(id);
          const trio = has ? s.trio.filter((x) => x !== id) : s.trio.length < 3 ? [...s.trio, id] : s.trio;
          return { trio };
        }),
      clearTrio: () => set({ trio: [], showAllClasses: true }),
      setShowAll: (v) => set({ showAllClasses: v }),
      setFilter: (f) => set({ filter: f }),
      setIsland: (id) => set((s) => ({ islandFilter: s.islandFilter === id ? null : id })),
      setSearch: (q) => set({ search: q }),
      setSortClosest: (v) => set({ sortClosest: v }),
      toggleExpand: (questId) =>
        set((s) => ({
          expandedQuestIds: s.expandedQuestIds.includes(questId)
            ? s.expandedQuestIds.filter((id) => id !== questId)
            : [...s.expandedQuestIds, questId],
        })),
      pinQuest: (questId) =>
        set((s) => {
          const pinned = s.pinnedQuestIds.includes(questId);
          if (pinned) {
            const overlayItemIds = { ...s.overlayItemIds };
            delete overlayItemIds[questId];
            return {
              pinnedQuestIds: s.pinnedQuestIds.filter((id) => id !== questId),
              overlayItemIds,
            };
          }
          const pinnedQuestIds = [...s.pinnedQuestIds, questId];
          const overlayItemIds = {
            ...s.overlayItemIds,
            [questId]: neededOverlayItems(questId, { ...s, pinnedQuestIds }),
          };
          const expandedQuestIds = s.expandedQuestIds.includes(questId) ? s.expandedQuestIds : [...s.expandedQuestIds, questId];
          return { pinnedQuestIds, overlayItemIds, expandedQuestIds, overlayVisible: true };
        }),
      toggleOverlayItem: (questId, itemId) =>
        set((s) => {
          const cur = s.overlayItemIds[questId] ?? [];
          const next = cur.includes(itemId) ? cur.filter((id) => id !== itemId) : [...cur, itemId];
          return { overlayItemIds: { ...s.overlayItemIds, [questId]: next } };
        }),
      toggleHave: (itemId) =>
        set((s) => {
          if (s.manualHave.includes(itemId)) {
            return { manualHave: s.manualHave.filter((id) => id !== itemId), manualNeed: [...s.manualNeed, itemId] };
          }
          if (s.manualNeed.includes(itemId)) {
            return { manualNeed: s.manualNeed.filter((id) => id !== itemId) };
          }
          return { manualHave: [...s.manualHave, itemId] };
        }),
      toggleDone: (questId) =>
        set((s) => {
          const on = s.doneIds.includes(questId);
          const doneIds = on ? s.doneIds.filter((id) => id !== questId) : [...s.doneIds, questId];
          const pinnedQuestIds = on ? s.pinnedQuestIds : s.pinnedQuestIds.filter((id) => id !== questId);
          return { doneIds, pinnedQuestIds };
        }),
      cycleRune: (name) =>
        set((s) => {
          const cur = s.runeCounts[name] ?? 0;
          const next = cur >= 6 ? 0 : cur + 1;
          return { runeCounts: { ...s.runeCounts, [name]: next } };
        }),
      setAllRunes: (n) =>
        set({ runeCounts: Object.fromEntries(WIND_RUNES.map((r) => [r, n])) }),
      importInventory: (text) =>
        set(() => {
          const parsed = parseInventoryDump(text);
          const inventoryCounts: Record<string, number> = {};
          for (const [k, v] of parsed.counts) inventoryCounts[k] = v;
          let matched = 0;
          for (const cls of dataset.classes) {
            for (const quest of cls.quests) {
              for (const item of quest.items) {
                if (namesForItem(item.name, item.aliases).some((n) => (inventoryCounts[n] ?? 0) > 0)) matched += 1;
              }
            }
          }
          return {
            inventoryCounts,
            lastInventoryNote: `${matched} turn-in rows matched from ${parsed.lineCount} dump lines. Currency-tab runes are not in this file.`,
          };
        }),
      importLog: (text, _incremental = false) =>
        set((s) => {
          const events = parseLog(text);
          const applied = applyLogEvents(events);
          const doneIds = new Set(s.doneIds);
          for (const cls of dataset.classes) {
            for (const quest of cls.quests) {
              const given = [...applied.given.entries()].find(([npc]) => testerMatches(quest.tester, npc));
              if (!given) continue;
              const items = given[1];
              const need = quest.items.map((it) => namesForItem(it.name, it.aliases));
              const allGiven = need.every((aliases) => aliases.some((n) => items.includes(n)));
              const xpOk = applied.xpAfterGive.has(given[0]) || applied.xpAfterGive.size === 0;
              if (allGiven && need.length > 0 && xpOk) doneIds.add(quest.id);
            }
          }
          return {
            logNet: applied.net,
            doneIds: [...doneIds],
            lastLogNote: `${events.length} log events. Live loot uses max(dump, log). Turn-in needs give-to-tester${applied.xpAfterGive.size ? " + XP" : ""}.`,
          };
        }),
      watchLog: async () => {
        logWatch?.stop();
        try {
          logWatch = await watchTextFile((text) => get().importLog(text), { liveOnly: false });
          set({ watchingLog: logWatch.label });
        } catch (err) {
          set({ lastLogNote: err instanceof Error ? err.message : "Watch failed" });
        }
      },
      watchInventory: async () => {
        invWatch?.stop();
        try {
          invWatch = await watchTextFile((text) => get().importInventory(text));
          set({ watchingInv: invWatch.label });
        } catch (err) {
          set({ lastInventoryNote: err instanceof Error ? err.message : "Watch failed" });
        }
      },
      stopWatches: () => {
        logWatch?.stop();
        invWatch?.stop();
        logWatch = null;
        invWatch = null;
        set({ watchingLog: "", watchingInv: "" });
      },
      setOverlayVisible: (v) => set({ overlayVisible: v }),
      setOverlayLocked: (v) => set({ overlayLocked: v }),
      setOpacity: (n) => set({ overlayOpacity: Math.min(100, Math.max(20, n)) }),
      setScale: (n) => set({ overlayScale: Math.min(140, Math.max(75, n)) }),
      setOverlayPopout: (v) => set({ overlayPopout: v }),
      setOverlayPos: (p) => set({ overlayPos: p }),
      setOverlaySize: (sz) => set({ overlaySize: sz }),
      setShowObtained: (v) => set({ showObtained: v }),
      loadDemo: () => {
        get().stopWatches();
        get().resetProgress();
        set({
          characterName: "Demo",
          serverName: "Halas",
          trio: ["BRD", "CLR", "WAR"],
          showAllClasses: false,
          demo: true,
          overlayVisible: true,
          overlayPopout: false,
          overlayLocked: false,
          overlayOpacity: 88,
          runeCounts: { "Wind Rune Lena": 1, "Wind Rune Azia": 0 },
          filter: "all",
          islandFilter: "7",
          sortClosest: true,
          showObtained: false,
        });
        get().importInventory(DEMO_INVENTORY);
        get().importLog(DEMO_LOG);
        const pin = ["BRD:test-of-pitch", "WAR:test-of-smash", "CLR:test-of-courage"];
        for (const id of pin) get().pinQuest(id);
      },
      resetProgress: () =>
        set({
          expandedQuestIds: [],
          pinnedQuestIds: [],
          overlayItemIds: {},
          manualHave: [],
          manualNeed: [],
          doneIds: [],
          runeCounts: {},
          inventoryCounts: {},
          logNet: {},
          lastInventoryNote: "",
          lastLogNote: "",
          demo: false,
        }),
    }),
    {
      name: "eqlsky.v1",
      partialize: (s) => ({
        characterName: s.characterName,
        serverName: s.serverName,
        trio: s.trio,
        showAllClasses: s.showAllClasses,
        expandedQuestIds: s.expandedQuestIds,
        pinnedQuestIds: s.pinnedQuestIds,
        overlayItemIds: s.overlayItemIds,
        showObtained: s.showObtained,
        manualHave: s.manualHave,
        manualNeed: s.manualNeed,
        doneIds: s.doneIds,
        runeCounts: s.runeCounts,
        inventoryCounts: s.inventoryCounts,
        logNet: s.logNet,
        filter: s.filter,
        islandFilter: s.islandFilter,
        sortClosest: s.sortClosest,
        overlayOpacity: s.overlayOpacity,
        overlayScale: s.overlayScale,
        overlayPos: s.overlayPos,
        overlaySize: s.overlaySize,
      }),
    }
  )
);

export function visibleClasses(s: SkyState) {
  if (!s.showAllClasses && s.trio.length === 3) {
    return dataset.classes.filter((c) => s.trio.includes(c.id));
  }
  return dataset.classes;
}

export function overlayClasses(s: SkyState) {
  const pinned = new Set(s.pinnedQuestIds.map((id) => questById.get(id)?.cls.id));
  const ids = new Set([...s.trio, ...pinned]);
  if (ids.size === 0) return dataset.classes;
  return dataset.classes.filter((c) => ids.has(c.id) || s.pinnedQuestIds.some((id) => id.startsWith(c.id + ":")));
}

export { missingCount, questState };
