# eqlSky

In-game Plane of Sky **class-unlock** overlay for EverQuest Legends. Sorted by class, then quest. Pin a test, tick which pieces belong on the HUD, and see Have / Need with creature and island for everything still missing.

Fan-made. Not affiliated with Daybreak or Game Jawn. Reads only the log and `/outputfile` dumps the client already writes. No memory read, no inject, no input to the game.

## In game (Windows)

The HUD is a **separate always-on-top window**. It opens with the app. It is not a panel inside the companion.

1. Run EverQuest Legends **borderless or windowed**. Exclusive fullscreen covers every overlay.
2. If you launch EQ **as Administrator**, launch eqlSky as Administrator too (Windows will not put a normal window over an elevated game).
3. `/log on`
4. At a banker, open **Bank** and **Dragon's Hoard**, then `/outputfile inventory`
5. Launch eqlSky (`npm run tauri dev` or the Windows installer). The HUD appears on top immediately. Alt-tab to EQ; the HUD stays above the game.
6. Set your trio. Import the dump. **Watch log** / **Watch dump** re-reads the file about once a second.
7. Wind Runes in **Currency / Alternate Storage** do not appear in the dump — click a rune chip to set how many you have (0–6).
8. Click a quest to expand it. **Track** pins it to the overlay. **HUD** on each item chooses what the overlay shows. Island buttons on the HUD list **NEED on this island**.
9. Global hotkeys (work while EQ is focused): `Ctrl+Shift+O` hide/show HUD, `Ctrl+Shift+L` lock click-through, `Ctrl+Shift+M` companion menu. Opacity changes the panel fill, not the text.

Bags full is **Ready**, not done. Shared drops use a pool (one Djinni War Blade does not fill two classes). Mark handed in yourself, or let give-to-tester (+ XP if the log has it) / the finished reward in the dump do it.

`npm run dev` in a browser cannot sit over the game. Use the Tauri app for the in-game HUD.

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
