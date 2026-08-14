# Dataset provenance — Plane of Sky class unlocks

Generated 14 Aug 2026 for EverQuest Legends only. Classic / p99 / EQ Live recipes are treated as contamination and are not used as turn-in lists.

## Counts

16 classes, 95 tests, 222 components, 15 Wind Runes (exactly one rune per test).

## Sources

| Layer | Source | Date | Used for |
| --- | --- | --- | --- |
| Primary graph | [eqlsource.com/tools/plane-of-sky](https://eqlsource.com/tools/plane-of-sky.html) `CLASSES` snapshot | 14 Aug 2026 (site cites eqprogression turn-ins read 4 Aug 2026) | Quests, testers, items, islands, creatures |
| Cross-check | [eqlegendstools.com](https://eqlegendstools.com/plane-of-sky-quests/) `questData` (222 rows) | 14 Aug 2026 | Names, aliases, source conflicts |
| Systems | [eqlwiki Patch_notes](https://eqlwiki.com/Patch_notes) 2026-05-26 / 2026-06-16 | Wind Runes replace class runes; bosses drop keys; Sirran no longer spawns; currency storage |
| Unlock framing | EQProgression Legends + eqlwiki Newbie Guide | Primary class unlock, token at 50, `/ach` |
| Hail (unverified classes) | EQProgression / eqlwiki class tables | RNG ROG SHD SHM WIZ say-lines, marked unverified |

Snapshots live in `scripts/source/`. Rebuild with `npm run dataset`.

## Confidence

- **verified** — eqlsource `v:1` class plus matching eqlegendstools row.
- **cross-corroborated** — turn-ins agree across eqlsource and eqlegendstools; class tooltips/hail not confirmed for Legends (RNG, ROG, SHD, SHM, WIZ).
- **conflict** — sources disagree; overlay shows the eqlsource creature list and an alt-source note.
- **unconfirmed** — a source already flagged the row (Gem of Invigoration).

## Conflicts (not silently resolved)

- **Efreeti Great Staff** — eqlsource/EQProgression: Noble Dojorn, Overseer of Air, Hand of Veeshan. eqlegendstools: Eye of Veeshan only.
- **Efreeti Statuette** — eqlsource/EQProgression: Island 4 soul/essence griffons. eqlegendstools: efreeti cycle.
- **Gem of Invigoration** — eqlsource: Island 7 drake/sphinx/spirit trash, unconfirmed. Loadout: Protector of Sky.

## Aliases

- Fae Amulet = Amulet of the Fae
- Harmonic Spear = Spear of Harmony
- Shimmering Bracer of Protection = Scintillating Bracer of Protection
- Curly quotes, exaltation `+N` suffixes, and `(Exaltation)` wrappers are stripped at match time.

## Drop rates

No public EQL tracker, wiki table, or EQProgression page published a reliable numeric drop rate as of 14 Aug 2026. The overlay shows creature, island, and drop kind (`zone-wide trash`, `island boss`, `efreeti cycle`, `island trash`). A `dropRate` field exists in the schema and stays `null` until a cross-corroborated percent appears.

## Deliberately omitted

Sirran Miniature Sword / Lost Rabbit's Foot / “Am I one with the wall” key quests; p99 lore flags as EQL item flags; Eye of Veeshan 32k HP (flagged p99 import); Fear/Hate planar armor; invented percents.
