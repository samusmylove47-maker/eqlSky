# eqlSky

In-game Plane of Sky **class-unlock** overlay for EverQuest Legends. Sorted by class, then quest. Pin a test, tick which pieces belong on the HUD, and see Have / Need with creature and island for everything still missing.

Fan-made. Not affiliated with Daybreak or Game Jawn. Reads only the log and `/outputfile` dumps the client already writes. No memory read, no inject, no input to the game.

## In game (Windows)

1. Run EverQuest Legends **borderless or windowed**. Exclusive fullscreen covers overlays.
2. `/log on`
3. At a banker, open **Bank** and **Dragon's Hoard**, then `/outputfile inventory`
4. Launch eqlSky. Set your trio. Import the dump. Import or watch the log if you want live loot.
5. Wind Runes in **Currency / Alternate Storage** do not appear in the dump — use the currency rune chips.
6. Click a quest to pin it. Use **HUD** on each item to choose what the overlay shows.
7. `Ctrl+Shift+O` toggles the overlay. `Ctrl+Shift+L` locks it (click-through in the native app). Opacity and scale are on the top bar.

Bags full is **Ready**, not done. Mark handed in yourself, or let a full give-to-tester log match / the finished reward in the dump do it.

## Demo (no game)

```bash
npm install
npm test
npm run dev
```

Open http://localhost:1420 and click **Load demo**. Drag the overlay, resize the corner, move the opacity slider.

## Native overlay

```bash
npm run tauri dev
```

Windows installers are built by `.github/workflows/release.yml` (`workflow_dispatch` or a `v*` tag) because this repo's cloud agents run on Linux.

## Data

`data/sky-quests.v1.json` — 16 classes, 95 tests, 222 components. Provenance and conflict notes: `data/PROVENANCE.md`. No drop percentages are published for EQL; the HUD shows creature, island, and drop kind only.

Rebuild the JSON from sourced snapshots:

```bash
npm run dataset
```
