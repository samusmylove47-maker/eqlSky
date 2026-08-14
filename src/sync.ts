import { useSky } from "./logic/store";

export function bindProgressSync() {
  window.addEventListener("storage", (ev) => {
    if (ev.key === "eqlsky.v1") void useSky.persist.rehydrate();
  });
}
