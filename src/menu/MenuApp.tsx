import { dataset, creatureLine, kindLabel } from "../data";
import { itemOwned, matchesFilter, outstandingByIsland, questState, questTouchesIsland, sharedOpenUses } from "../logic/progress";
import { OverlayWindow } from "../overlay/OverlayWindow";
import { selectProgress, useSky, visibleClasses, WIND_RUNES } from "../logic/store";
import { openOverlayWindow } from "../tauri";
import type { QuestFilter } from "../types";

const FILTERS: { id: QuestFilter; label: string }[] = [
  { id: "all", label: "All tests" },
  { id: "needed", label: "Still needed" },
  { id: "ready", label: "Ready to hand in" },
  { id: "rune", label: "Needs rune" },
];

export function MenuApp() {
  const s = useSky();
  const p = selectProgress(s);
  const classes = visibleClasses(s);
  const counts = outstandingByIsland(classes, p);
  const focusIds = s.trio.length === 3 ? s.trio : dataset.classes.map((c) => c.id);

  function onFile(kind: "inv" | "log", file: File | undefined) {
    if (!file) return;
    void file.text().then((t) => (kind === "inv" ? s.importInventory(t) : s.importLog(t)));
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">
          eqlSky<span>Plane of Sky</span>
        </h1>
        <input
          type="text"
          placeholder="Character (optional)"
          value={s.characterName}
          maxLength={24}
          onChange={(e) => s.setName(e.target.value)}
        />
        <div className="row">
          {dataset.classes.map((c) => (
            <button
              key={c.id}
              className={`chip ${s.trio.includes(c.id) ? "on" : ""}`}
              onClick={() => s.toggleTrio(c.id)}
              title={c.name}
            >
              {c.id}
            </button>
          ))}
        </div>
        <button className="btn" onClick={s.clearTrio}>
          Clear trio
        </button>
        <label className="help">
          <input type="checkbox" checked={s.showAllClasses} onChange={(e) => s.setShowAll(e.target.checked)} /> Show all 16
        </label>
        <span className="grow" />
        <button className="btn" onClick={s.loadDemo}>
          Load demo
        </button>
        <button className={`btn ${s.overlayVisible ? "on" : ""}`} onClick={() => s.setOverlayVisible(!s.overlayVisible)}>
          Overlay
        </button>
        <button
          className="btn"
          onClick={() => {
            s.setOverlayPopout(true);
            void openOverlayWindow();
          }}
        >
          Pop out
        </button>
      </header>

      <div className="filterbar">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${s.filter === f.id ? "on" : ""}`} onClick={() => s.setFilter(f.id)}>
            {f.label}
          </button>
        ))}
        <span className="grow" />
        <span className="range">
          Opacity
          <input type="range" min={20} max={100} value={s.overlayOpacity} onChange={(e) => s.setOpacity(Number(e.target.value))} />
          {s.overlayOpacity}%
        </span>
        <span className="range">
          Scale
          <input type="range" min={75} max={140} value={s.overlayScale} onChange={(e) => s.setScale(Number(e.target.value))} />
          {s.overlayScale}%
        </span>
      </div>

      <p className="note-line">{dataset.notes.questRoom} Completing every test unlocks that class as Primary.</p>

      <div className="main">
        <aside className="ladder">
          <div className="meta" style={{ padding: "0 8px 8px" }}>
            Island still-needed
          </div>
          {dataset.islands.map((isl) => {
            const n = counts.get(isl.id) ?? 0;
            return (
              <button
                key={isl.id}
                className={s.islandFilter === isl.id ? "on" : ""}
                onClick={() => s.setIsland(isl.id)}
              >
                <span>
                  {isl.number} {isl.name}
                </span>
                <span className={`n ${n === 0 ? "zero" : ""}`}>{n}</span>
              </button>
            );
          })}
        </aside>

        <div className="sheet">
          {classes.map((cls) => {
            const quests = cls.quests.filter((q) => {
              const st = questState(q, p);
              return matchesFilter(st, s.filter) && questTouchesIsland(q, s.islandFilter, p);
            });
            const done = cls.quests.filter((q) => questState(q, p) === "done").length;
            if (s.filter !== "all" && quests.length === 0) return null;
            return (
              <section key={cls.id} className="class-block">
                <div className="class-head">
                  <h2>{cls.name}</h2>
                  <span className="meta">
                    {done}/{cls.quests.length} · {cls.hub} · {cls.armor}
                    {!cls.verified ? " · hail unverified" : ""}
                  </span>
                  <div className="meter">
                    <i style={{ width: `${(done / cls.quests.length) * 100}%` }} />
                  </div>
                </div>
                {quests.map((quest) => {
                  const st = questState(quest, p);
                  const pinned = s.pinnedQuestIds.includes(quest.id);
                  const overlaySet = new Set(s.overlayItemIds[quest.id] ?? []);
                  return (
                    <article key={quest.id} className={`quest ${st} ${pinned ? "pinned" : ""}`}>
                      <button className="quest-head" onClick={() => s.pinQuest(quest.id)}>
                        <div>
                          <h3>{quest.reward.name}</h3>
                          <div className="meta">
                            {quest.name} · {quest.tester}
                            {quest.say ? ` · say ${quest.say}` : ""}
                            {quest.reward.slot ? ` · ${quest.reward.slot}` : ""}
                          </div>
                        </div>
                        <div className="badges">
                          {pinned ? <span className="chip on">Tracking</span> : <span className="chip">Click to track</span>}
                          {st === "ready" ? <span className="chip on">Ready</span> : null}
                          {st === "needs-rune" ? <span className="chip on">Needs rune</span> : null}
                          {st === "done" ? <span className="chip">Done</span> : null}
                          {quest.island8 ? <span className="chip warn">Island 8</span> : null}
                          {quest.reward.haste ? <span className="chip">{quest.reward.haste}% haste</span> : null}
                          {quest.sayConfidence === "unverified" ? <span className="chip warn">Unverified</span> : null}
                        </div>
                      </button>
                      {pinned ? (
                        <div className="items">
                          {quest.items.map((item) => {
                            const have = itemOwned(item, p);
                            const shared = sharedOpenUses(item.name, focusIds, p);
                            return (
                              <div key={item.id} className={`item ${have ? "have" : "need"}`}>
                                <button
                                  className={`check ${have ? "on" : ""}`}
                                  aria-pressed={have}
                                  title="Have this piece"
                                  onClick={() => s.toggleHave(item.id)}
                                />
                                <button
                                  className={`ov ${overlaySet.has(item.id) ? "on" : ""}`}
                                  onClick={() => s.toggleOverlayItem(quest.id, item.id)}
                                >
                                  HUD
                                </button>
                                <div>
                                  <div className="name">{item.name}</div>
                                  <div className="drop">
                                    {have ? "in hand" : creatureLine(item)}
                                    {item.dropRate != null ? ` · ${item.dropRate}%` : ""}
                                  </div>
                                  {!have && item.notes ? <div className="note">{item.notes}</div> : null}
                                  {shared.length > 1 ? (
                                    <div className="shared">
                                      Shared with {shared.map((u) => u.classId).join(", ")} · {kindLabel(item.kind)}
                                    </div>
                                  ) : null}
                                </div>
                                <span className="meta">{have ? "HAVE" : "NEED"}</span>
                              </div>
                            );
                          })}
                          <div className="row">
                            <button className={`btn ${st === "done" ? "on" : ""}`} onClick={() => s.toggleDone(quest.id)}>
                              {st === "done" ? "Handed in" : "Mark handed in"}
                            </button>
                            <span className="help">Bags full ≠ done. Reward in dump or a full give-to-tester log match also marks done.</span>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>

      <footer
        className="statusbar"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (!file) return;
          const name = file.name.toLowerCase();
          void file.text().then((t) => {
            if (name.includes("log") || t.includes("You have looted") || t.includes("you have looted")) s.importLog(t);
            else s.importInventory(t);
          });
        }}
      >
        <label className="file btn">
          Import inventory.txt
          <input type="file" accept=".txt,text/plain" onChange={(e) => onFile("inv", e.target.files?.[0])} />
        </label>
        <label className="file btn">
          Import eqlog
          <input type="file" accept=".txt,text/plain" onChange={(e) => onFile("log", e.target.files?.[0])} />
        </label>
        <span className="help">{s.lastInventoryNote}</span>
        <span className="help">{s.lastLogNote}</span>
        <span className="grow" />
        <div className="runes">
          <span className="help">Currency runes</span>
          <button className="btn" onClick={() => s.setAllRunes(true)}>
            All
          </button>
          <button className="btn" onClick={() => s.setAllRunes(false)}>
            None
          </button>
          {WIND_RUNES.map((n) => (
            <button
              key={n}
              className={`chip ${s.currencyRunes.map((x) => x.toLowerCase()).includes(n.toLowerCase()) ? "on" : ""}`}
              onClick={() => s.toggleRune(n)}
            >
              {n.replace("Wind Rune ", "")}
            </button>
          ))}
        </div>
        <button className="btn danger" onClick={s.resetProgress}>
          Reset ticks
        </button>
        <span className="help">Ctrl+Shift+O overlay · Ctrl+Shift+L lock · borderless EQL · no memory read</span>
      </footer>
      {s.overlayVisible && !s.overlayPopout ? <OverlayWindow /> : null}
    </div>
  );
}
