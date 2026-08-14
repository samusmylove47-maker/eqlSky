import { dataset, creatureLine, kindLabel } from "../data";
import { itemOwned, matchesFilter, missingCount, outstandingByIsland, questState, questTouchesIsland, sharedOpenUses } from "../logic/progress";
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
  const counts = outstandingByIsland(classes, p, s.pinnedQuestIds);

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
          placeholder="Character"
          value={s.characterName}
          maxLength={24}
          onChange={(e) => s.setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Server"
          value={s.serverName}
          maxLength={24}
          onChange={(e) => s.setServer(e.target.value)}
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
        <input
          type="text"
          placeholder="Search item, reward, mob…"
          value={s.search}
          onChange={(e) => s.setSearch(e.target.value)}
        />
        <label className="help">
          <input type="checkbox" checked={s.sortClosest} onChange={(e) => s.setSortClosest(e.target.checked)} /> Closest
        </label>
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
            const quests = cls.quests
              .filter((q) => {
                const st = questState(q, p, classes, s.pinnedQuestIds);
                const pinned = s.pinnedQuestIds.includes(q.id);
                if (pinned) return questTouchesIsland(q, s.islandFilter, p, classes, s.pinnedQuestIds) || !s.islandFilter;
                if (!matchesFilter(st, s.filter) || !questTouchesIsland(q, s.islandFilter, p, classes, s.pinnedQuestIds)) return false;
                if (!s.search.trim()) return true;
                const qstr = [q.name, q.reward.name, q.tester, ...q.items.flatMap((it) => [it.name, ...it.creatures])].join(" ").toLowerCase();
                return qstr.includes(s.search.trim().toLowerCase());
              })
              .sort((a, b) => {
                if (!s.sortClosest) return 0;
                return missingCount(a, p, classes, s.pinnedQuestIds) - missingCount(b, p, classes, s.pinnedQuestIds);
              });
            const done = cls.quests.filter((q) => questState(q, p, classes, s.pinnedQuestIds) === "done").length;
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
                  const st = questState(quest, p, classes, s.pinnedQuestIds);
                  const pinned = s.pinnedQuestIds.includes(quest.id);
                  const expanded = pinned || s.expandedQuestIds.includes(quest.id);
                  const overlaySet = new Set(s.overlayItemIds[quest.id] ?? []);
                  return (
                    <article key={quest.id} className={`quest ${st} ${pinned ? "pinned" : ""}`}>
                      <div className="quest-head">
                        <button type="button" className="quest-head" style={{ padding: 0 }} onClick={() => s.toggleExpand(quest.id)}>
                          <div>
                            <h3>{quest.reward.name}</h3>
                            <div className="meta">
                              {quest.name} · {quest.tester}
                              {quest.say ? ` · say ${quest.say}` : ""}
                              {quest.reward.slot ? ` · ${quest.reward.slot}` : ""}
                            </div>
                          </div>
                        </button>
                        <div className="badges">
                          <button className={`chip ${pinned ? "on" : ""}`} onClick={() => s.pinQuest(quest.id)}>
                            {pinned ? "Tracking" : "Track"}
                          </button>
                          {st === "ready" ? <span className="chip on">Ready</span> : null}
                          {st === "needs-rune" ? <span className="chip on">Needs rune</span> : null}
                          {st === "done" ? <span className="chip">Done</span> : null}
                          {quest.island8 ? <span className="chip warn">Island 8</span> : null}
                          {quest.reward.haste ? <span className="chip">{quest.reward.haste}% haste</span> : null}
                          {quest.sayConfidence === "unverified" ? <span className="chip warn">Unverified</span> : null}
                        </div>
                      </div>
                      {expanded ? (
                        <div className="items">
                          {quest.reward.stats ? <div className="help">{quest.reward.stats}</div> : null}
                          {quest.items.map((item) => {
                            const have = itemOwned(item, quest, p, classes, s.pinnedQuestIds);
                            const shared = sharedOpenUses(item, classes, p);
                            return (
                              <div key={item.id} className={`item ${have ? "have" : "need"}`}>
                                <label className="help" title="Have this piece">
                                  <input type="checkbox" checked={have} onChange={() => s.toggleHave(item.id)} aria-label={`Have ${item.name}`} />
                                </label>
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
                            <span className="help">Bags full ≠ done. Reward in dump or give-to-tester (+ XP if present) marks done.</span>
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
        <button className={`btn ${s.watchingInv ? "on" : ""}`} onClick={() => void s.watchInventory()}>
          Watch dump
        </button>
        <button className={`btn ${s.watchingLog ? "on" : ""}`} onClick={() => void s.watchLog()}>
          Watch log
        </button>
        {s.watchingLog || s.watchingInv ? (
          <button className="btn" onClick={s.stopWatches}>
            Stop watch
          </button>
        ) : null}
        <span className="help">{s.lastInventoryNote}</span>
        <span className="help">{s.lastLogNote}</span>
        <span className="grow" />
        <div className="runes">
          <span className="help">Currency runes (click = count)</span>
          <button className="btn" onClick={() => s.setAllRunes(1)}>
            1 each
          </button>
          <button className="btn" onClick={() => s.setAllRunes(0)}>
            None
          </button>
          {WIND_RUNES.map((n) => (
            <button key={n} className={`chip ${(s.runeCounts[n] ?? 0) > 0 ? "on" : ""}`} onClick={() => s.cycleRune(n)}>
              {n.replace("Wind Rune ", "")}
              {(s.runeCounts[n] ?? 0) > 0 ? ` ${s.runeCounts[n]}` : ""}
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
