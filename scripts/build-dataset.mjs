#!/usr/bin/env node
/**
 * Build data/sky-quests.v1.json from sourced snapshots.
 * Primary graph: eqlsource CLASSES (2026-08-14). Cross-check: eqlegendstools questData.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/source/eqlsource-classes.json"), "utf8")
);
const questData = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/source/eqlegendstools-questData.json"), "utf8")
);

const HAIL_UNVERIFIED = {
  RNG: {
    "Griffon Talon Necklace": "body",
    "Dark Cloak of the Sky": "defense",
    "Earthshaker's Mantle": "earth",
    "Thunderforged Earring": "thunder",
    Arydryidriyorn: "blade",
    Windstriker: "ranged",
  },
  ROG: {
    "Wispy Choker of Vigor": "thievery",
    "Crystal Mask": "cunning",
    "Griffon Wing Spaulders": "silence",
    "Shimmering Bracer of Protection": "stealth",
    "Renard's Belt of Quickness": "trickery",
    Thornstinger: "deception",
  },
  SHD: {
    "Amulet of the Sphinx Eye": "bash",
    "Crimson Ring of the Djinni": "smash",
    "Pegasus-Hide Belt": "slash",
    "Blood Sky Face Plate": "disempowerment",
    "Obtenebrate Mithril Guard": "envenoming",
    "Khyldorn the Blood Drinker": "necropotence",
    "Pearlescent Pauldrons": "raising of the dead",
  },
  SHM: {
    "Amulet of the Fang": "might",
    "Bracelet of the Spirits": "health",
    "Fairy-Hide Mantle": "sight",
    "Vermilion Sky Ring": "snake",
    "Warhammer of the Wind": "shrink",
    Garduk: "witch doctor",
  },
  WIZ: {
    "Augmentor's Mask": "concentration",
    "Al`Kabor's Cap of Binding": "focus",
    "Raiment of Thunder": "meditation",
    "Solidate Mithril Ring": "conception",
    "Amulet of the Void": "visualization",
    "Nargon's Staff": "preparation",
  },
};

const REWARD_ALIASES = {
  "Fae Amulet": ["Amulet of the Fae"],
  "Harmonic Spear": ["Spear of Harmony"],
  "Shimmering Bracer of Protection": ["Scintillating Bracer of Protection"],
  "Theurgist's Star": ["Theurgist’s Star"],
  "Windhowl + Spirit Render": ["Windhowl/Spirit Render", "Windhowl", "Spirit Render"],
};

const ITEM_ALIASES = {
  "Shimmering Bracer of Protection": ["Scintillating Bracer of Protection"],
  "Spiritualist's Ring": ["Spiritualist`s Ring", "Spiritualist’s Ring"],
  "Spiroc Elder's Totem": ["Spiroc Elder’s Totem"],
  "Griffon's Beak": ["Griffon’s Beak"],
  "Ton Po's Eye Patch": ["Ton Po’s Eye Patch"],
  "Ton Po's Shoulder Wraps": ["Ton Po’s Shoulder Wraps"],
  "Wu's Fist of Mastery": ["Wu’s Fist of Mastery"],
  "Al`Kabor's Cap of Binding": ["Al'Kabor's Cap of Binding", "Al’Kabor's Cap of Binding"],
};

const ITEM_CONFLICTS = {
  "Efreeti Great Staff": {
    confidence: "conflict",
    notes:
      "eqlsource + EQProgression: Noble Dojorn / Overseer of Air / Hand of Veeshan. eqlegendstools lists Eye of Veeshan only. Overlay shows the cycle and flags the conflict.",
    altCreatures: ["Eye of Veeshan"],
  },
  "Efreeti Statuette": {
    confidence: "conflict",
    notes:
      "eqlsource + EQProgression: Island 4 soul/essence griffons (Eternal Spirit unconfirmed). eqlegendstools lists the efreeti cycle. Overlay keeps the griffon source and flags the conflict.",
    altCreatures: ["Noble Dojorn", "Overseer of Air", "the Hand of Veeshan"],
  },
  "Gem of Invigoration": {
    confidence: "unconfirmed",
    notes:
      "eqlsource: Island 7 drake/sphinx/spirit trash, flagged unconfirmed. Loadout DB lists Protector of Sky (Island 2). No third corroboration.",
    altCreatures: ["Protector of Sky"],
  },
};

function slug(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[`’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dropKind(item) {
  if (item.rune) return "zone-wide-trash";
  const islands = item.i || [];
  const mob = (item.m || "").toLowerCase();
  if (islands.length === 3 && islands.includes("1.5") && islands.includes("4") && islands.includes("8")) {
    return "efreeti-cycle";
  }
  if (mob.includes("trash") || mob.includes("bee mob") || mob.includes("griffon") || mob.includes("drake")) {
    return "island-trash";
  }
  if (mob.includes("boss") || islands.some((x) => x !== "any")) return "island-boss";
  return "unknown";
}

function creatures(item) {
  const m = item.m || "";
  if (item.rune) return ["any Plane of Sky mob"];
  if (m.includes("·")) {
    return m.split("·").map((s) => s.replace(/\s*\(.*?\)\s*/g, "").trim()).filter(Boolean);
  }
  const cleaned = m
    .replace(/\s*\((boss|final boss)\)\s*/gi, "")
    .replace(/\s*—.*$/, "")
    .trim();
  if (cleaned.includes("/")) {
    return cleaned.split("/").map((s) => s.trim()).filter(Boolean);
  }
  if (cleaned.includes(",")) {
    return cleaned.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [cleaned];
}

function islandLabel(id) {
  const row = src.ISLANDS[id];
  if (!row) return id;
  const boss = String(row.boss).replace(/\s*—.*$/, "");
  return {
    id,
    number: row.n,
    name: row.name,
    boss,
    depth: row.d,
  };
}

function normalizeName(s) {
  return String(s)
    .replace(/[`’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const toolsByReward = new Map();
for (const row of questData) {
  const key = `${normalizeName(row.className)}|${normalizeName(row.reward)}`;
  if (!toolsByReward.has(key)) toolsByReward.set(key, []);
  toolsByReward.get(key).push(row);
}

const islands = src.LADDER.map(islandLabel);

const classes = src.ORDER.map((abbr) => {
  const cl = src.CLASSES[abbr];
  const verified = Boolean(cl.v);
  const quests = cl.q.map((q, qi) => {
    const questId = `${abbr}:${slug(q.n)}`;
    const hailMap = HAIL_UNVERIFIED[abbr];
    let say = q.say || "";
    let sayConfidence = verified ? "verified" : "unverified";
    if (!verified && hailMap && hailMap[q.r]) {
      say = hailMap[q.r];
      sayConfidence = "unverified";
    }
    const rewardAliases = REWARD_ALIASES[q.r] || [];
    const items = q.it.map((it, ii) => {
      const conflict = ITEM_CONFLICTS[it.n];
      const kind = dropKind(it);
      const conf = conflict
        ? conflict.confidence
        : it.flag
          ? "unconfirmed"
          : verified
            ? "verified"
            : "cross-corroborated";
      return {
        id: `${questId}:${slug(it.n)}:${ii}`,
        name: it.n,
        aliases: ITEM_ALIASES[it.n] || [],
        rune: Boolean(it.rune),
        qty: 1,
        kind,
        islands: it.i,
        creatures: creatures(it),
        confidence: conf,
        notes: conflict?.notes || it.flag || null,
        dropRate: null,
        altCreatures: conflict?.altCreatures || null,
      };
    });
    const islandDepths = items
      .flatMap((it) => it.islands)
      .map((id) => src.ISLANDS[id]?.d ?? 0);
    const haste = typeof q.haste === "number" ? q.haste : /Haste \+(\d+)%/i.test(q.st || "") ? Number(RegExp.$1) : null;
    return {
      id: questId,
      index: qi,
      name: q.n,
      tester: q.g,
      say,
      sayConfidence,
      reward: {
        name: q.r,
        aliases: rewardAliases,
        slot: q.s,
        stats: q.st || "",
        haste,
      },
      island8: items.some((it) => it.islands.includes("8") && it.kind !== "efreeti-cycle"),
      items,
    };
  });
  return {
    id: abbr,
    name: cl.label,
    hub: cl.hub,
    armor: cl.armor,
    verified,
    quests,
  };
});

const nameIndex = new Map();
for (const cl of classes) {
  for (const q of cl.quests) {
    for (const it of q.items) {
      const key = normalizeName(it.name);
      if (!nameIndex.has(key)) nameIndex.set(key, []);
      nameIndex.get(key).push({ classId: cl.id, className: cl.name, questId: q.id, questName: q.name, reward: q.reward.name });
    }
  }
}

const sharedItems = [...nameIndex.entries()]
  .filter(([, uses]) => new Set(uses.map((u) => u.classId)).size > 1)
  .map(([name, uses]) => ({
    name: uses[0] ? classes.flatMap((c) => c.quests).flatMap((q) => q.items).find((i) => normalizeName(i.name) === name)?.name : name,
    uses,
  }));

const dataset = {
  version: 1,
  generated: "2026-08-14",
  zone: "airplane",
  zoneName: "Plane of Sky",
  notes: {
    unlock:
      "Completing every Plane of Sky test for a class unlocks that class as a Primary. /ach tracks this. One free Primary Class Unlock Token at first level 50.",
    questRoom:
      "Buy Efreeti's Key (free) from the Key Master on Island 1. North teleport pad ~1600, 520. Keys persist on the keyring after first use.",
    windRunes:
      "Wind Runes drop zone-wide from trash and live in Currency / Alternate Storage. /outputfile inventory does not dump the currency tab.",
    keys: "Island bosses drop the next island key. Sirran key turn-ins are classic leftover and are not used in EverQuest Legends.",
    dropRates:
      "No public EQL source publishes a reliable numeric drop rate. Overlay shows creature, island, and drop kind only.",
  },
  islands,
  classes,
  sharedItems: sharedItems.map((s) => ({
    name: s.name,
    classIds: [...new Set(s.uses.map((u) => u.classId))],
    questIds: s.uses.map((u) => u.questId),
  })),
};

const outPath = path.join(root, "data/sky-quests.v1.json");
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");

const questCount = classes.reduce((n, c) => n + c.quests.length, 0);
const itemCount = classes.reduce((n, c) => n + c.quests.reduce((m, q) => m + q.items.length, 0), 0);
const runeCount = classes.reduce(
  (n, c) => n + c.quests.reduce((m, q) => m + q.items.filter((i) => i.rune).length, 0),
  0
);
console.log({
  classes: classes.length,
  quests: questCount,
  components: itemCount,
  runes: runeCount,
  shared: dataset.sharedItems.length,
  out: outPath,
});
if (classes.length !== 16 || questCount !== 95 || itemCount !== 222 || runeCount !== 95) {
  console.error("Integrity mismatch");
  process.exit(1);
}
