# eqlSky

In-game Plane of Sky **class-unlock** overlay for EverQuest Legends. Sorted by class, then quest. Pin a test, tick which pieces belong on the HUD, and see Have / Need with creature and island for everything still missing.

Fan-made. Not affiliated with Daybreak or Game Jawn. Reads only the log and `/outputfile` dumps the client already writes. No memory read, no inject, no input to the game.

## In game (Windows)

1. Run EverQuest Legends **borderless or windowed**. Exclusive fullscreen covers overlays.
2. `/log on`
3. At a banker, open **Bank** and **Dragon's Hoard**, then `/outputfile inventory`
4. Launch eqlSky. Set your trio (and server). Import the dump. **Watch log** / **Watch dump** re-reads the file about once a second (Chrome/Edge or the Tauri app).
5. Wind Runes in **Currency / Alternate Storage** do not appear in the dump — click a rune chip to set how many you have (0–6).
6. Click a quest to expand it. **Track** pins it to the overlay. **HUD** on each item chooses what the overlay shows.
7. Click an island on the ladder: the overlay lists **NEED on this island** for tracked classes (farm mode), then pinned tests.
8. `Ctrl+Shift+O` toggles the overlay. `Ctrl+Shift+L` locks the list (chrome stays clickable). Opacity changes the panel fill, not the text.

Bags full is **Ready**, not done. Shared drops use a pool (one Djinni War Blade does not fill two classes). Mark handed in yourself, or let give-to-tester (+ XP if the log has it) / the finished reward in the dump do it.

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
