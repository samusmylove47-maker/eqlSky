import { creatureLine, islandById, questById } from "../data";
import { islandNeeds, itemOwned, poolCount, questState, sharedOpenUses } from "./progress";
import { overlayClasses, selectProgress, useSky } from "./store";

export function OverlayHud() {
  const s = useSky();
  const p = selectProgress(s);
  const classes = overlayClasses(s);
  const pinned = s.pinnedQuestIds
    .map((id) => questById.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const grouped = classes
    .map((cls) => ({
      cls,
      quests: pinned.filter((row) => row.cls.id === cls.id),
    }))
    .filter((g) => g.quests.length);

  const island = s.islandFilter ? islandById.get(s.islandFilter) : null;
  const farm = s.islandFilter ? islandNeeds(classes, s.islandFilter, p, s.pinnedQuestIds) : [];

  return (
    <div className="overlay-body">
      <div className="meta">
        {s.characterName || "Sky"}
        {s.trio.length ? ` · ${s.trio.join("/")}` : ""}
        {s.watchingLog ? ` · tail ${s.watchingLog}` : ""}
      </div>
      {island ? (
        <section className="ov-quest">
          <div className="ov-class">
            On I{island.number} · {island.boss}
          </div>
          {farm.length === 0 ? (
            <div className="meta">Clear for tracked classes.</div>
          ) : (
            farm.map(({ cls, quest, item }) => (
              <div key={`${quest.id}:${item.id}`} className="ov-item need here">
                <div className="name">
                  NEED {item.name}
                  <span className="meta">
                    {" "}
                    · {cls.id} · {quest.name.replace(/^Test of /i, "")}
                  </span>
                </div>
                <div className="drop">{creatureLine(item)}</div>
              </div>
            ))
          )}
        </section>
      ) : null}
      {grouped.length === 0 && !island ? (
        <div className="empty">Pin a quest or pick an island.</div>
      ) : (
        grouped.map(({ cls, quests }) => (
          <section key={cls.id}>
            <div className="ov-class">{cls.name}</div>
            {quests.map(({ quest }) => {
              const state = questState(quest, p, classes, s.pinnedQuestIds);
              const shown = (s.overlayItemIds[quest.id] ?? [])
                .map((id) => quest.items.find((it) => it.id === id))
                .filter((it): it is NonNullable<typeof it> => Boolean(it))
                .filter((it) => {
                  const have = itemOwned(it, quest, p, classes, s.pinnedQuestIds);
                  return s.showObtained || !have || state === "ready";
                });
                  const haveN = quest.items.filter((it) => itemOwned(it, quest, p, classes, s.pinnedQuestIds)).length;
              return (
                <div key={quest.id} className="ov-quest">
                  <h4>
                    <span>{quest.reward.name}</span>
                    <span className="meta">{state === "done" ? "done" : `${haveN}/${quest.items.length}`}</span>
                  </h4>
                  <div className="meta">
                    {quest.say ? `say ${quest.say}` : quest.name}
                    {quest.reward.haste ? ` · ${quest.reward.haste}% haste` : ""}
                  </div>
                  {state === "ready" ? <div className="meta">Ready · {quest.tester}</div> : null}
                  {shown.map((item) => {
                    const have = itemOwned(item, quest, p, classes, s.pinnedQuestIds);
                    const shared = sharedOpenUses(item, classes, p).filter((u) => u.questId !== quest.id);
                    const pool = poolCount(item.name, p);
                    const onIsland = s.islandFilter ? item.islands.includes(s.islandFilter) : false;
                    return (
                      <div key={item.id} className={`ov-item ${have ? "have" : "need"} ${onIsland ? "here" : ""}`}>
                        <div className="name">
                          {have ? "HAVE" : "NEED"} {item.name}
                          {item.rune ? " · rune" : ""}
                          {!item.rune && pool > 0 ? ` · x${pool}` : ""}
                        </div>
                        {!have ? <div className="drop">{creatureLine(item)}</div> : null}
                        {!have && item.notes ? <div className="note">{item.notes}</div> : null}
                        {shared.length > 0 ? (
                          <div className="shared">also {shared.map((u) => u.classId).join(", ")}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
