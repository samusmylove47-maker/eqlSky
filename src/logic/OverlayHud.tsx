import { dataset, creatureLine, islandById, questById } from "../data";
import { itemOwned, questState, sharedOpenUses } from "./progress";
import { selectProgress, useSky, visibleClasses } from "./store";

export function OverlayHud() {
  const s = useSky();
  const p = selectProgress(s);
  const focus = s.trio.length === 3 ? s.trio : [];
  const pinned = s.pinnedQuestIds
    .map((id) => questById.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const grouped = visibleClasses(s)
    .map((cls) => ({
      cls,
      quests: pinned.filter((row) => row.cls.id === cls.id),
    }))
    .filter((g) => g.quests.length);

  const island = s.islandFilter ? islandById.get(s.islandFilter) : null;

  return (
    <div className="overlay-body">
      {s.characterName ? (
        <div className="meta">
          {s.characterName}
          {s.trio.length ? ` · ${s.trio.join(" / ")}` : ""}
        </div>
      ) : null}
      {island ? (
        <div className="meta">
          Tracking drops on {island.name} · {island.boss}
        </div>
      ) : null}
      {grouped.length === 0 ? (
        <div className="empty">Pin a quest from the menu. Sorted by class, then quest.</div>
      ) : (
        grouped.map(({ cls, quests }) => (
          <section key={cls.id}>
            <div className="ov-class">
              {cls.name}
              {!cls.verified ? " · unverified hail" : ""}
            </div>
            {quests.map(({ quest }) => {
              const state = questState(quest, p);
              const shown = (s.overlayItemIds[quest.id] ?? [])
                .map((id) => quest.items.find((it) => it.id === id))
                .filter((it): it is NonNullable<typeof it> => Boolean(it));
              const haveN = quest.items.filter((it) => itemOwned(it, p)).length;
              return (
                <div key={quest.id} className="ov-quest">
                  <h4>
                    <span>{quest.reward.name}</span>
                    <span className="meta">{state === "done" ? "done" : `${haveN}/${quest.items.length}`}</span>
                  </h4>
                  <div className="meta">
                    {quest.name} · {quest.tester}
                    {quest.reward.haste ? ` · ${quest.reward.haste}% haste` : ""}
                    {quest.island8 ? " · Island 8" : ""}
                  </div>
                  {shown.length === 0 ? (
                    <div className="meta">No items checked for overlay.</div>
                  ) : (
                    shown.map((item) => {
                      const have = itemOwned(item, p);
                      const shared = sharedOpenUses(
                        item.name,
                        focus.length ? focus : dataset.classes.map((c) => c.id),
                        p
                      );
                      const onIsland = s.islandFilter ? item.islands.includes(s.islandFilter) : false;
                      return (
                        <div key={item.id} className={`ov-item ${have ? "have" : "need"} ${onIsland ? "here" : ""}`}>
                          <div className="name">
                            {have ? "HAVE  " : "NEED  "}
                            {item.name}
                            {item.rune ? "  (currency)" : ""}
                          </div>
                          {!have ? <div className="drop">{creatureLine(item)}</div> : null}
                          {!have && item.notes ? <div className="note">{item.notes}</div> : null}
                          {!have && item.altCreatures?.length ? (
                            <div className="note">Alt source (unresolved): {item.altCreatures.join(" · ")}</div>
                          ) : null}
                          {shared.length > 1 ? (
                            <div className="shared">Shared · {shared.length} open tests still want this</div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
