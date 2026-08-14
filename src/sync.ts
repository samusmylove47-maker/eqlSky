import { useSky } from "./logic/store";
import { isTauri } from "./tauri";

export const PERSIST_KEY = "eqlsky.v1";
const CHANNEL = "eqlsky.v1";

export function persistSnapshot(): string | null {
  try {
    return localStorage.getItem(PERSIST_KEY);
  } catch {
    return null;
  }
}

export function shouldApplyRemotePersist(local: string | null, remote: string | null | undefined): boolean {
  return typeof remote === "string" && remote.length > 0 && remote !== local;
}

export function bindProgressSync() {
  let applying = false;

  const apply = (remote: string | null | undefined) => {
    if (!shouldApplyRemotePersist(persistSnapshot(), remote) || applying) return;
    applying = true;
    try {
      localStorage.setItem(PERSIST_KEY, remote as string);
      const hydrated = useSky.persist.rehydrate();
      if (hydrated && typeof hydrated.then === "function") {
        void hydrated.finally(() => {
          applying = false;
        });
      } else {
        applying = false;
      }
    } catch {
      applying = false;
    }
  };

  window.addEventListener("storage", (ev) => {
    if (ev.key === PERSIST_KEY) apply(ev.newValue);
  });

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (ev) => {
      if (typeof ev.data === "string") apply(ev.data);
    };
  } catch {
    /* WebView without BroadcastChannel */
  }

  let last = persistSnapshot();
  const publish = () => {
    if (applying) return;
    const next = persistSnapshot();
    if (next === last) return;
    last = next;
    try {
      bc?.postMessage(next);
    } catch {
      /* ignore */
    }
    if (isTauri()) {
      void import("@tauri-apps/api/event")
        .then(({ emit }) => emit("eqlsky://persist", next))
        .catch(() => {});
    }
  };

  useSky.subscribe(() => {
    queueMicrotask(publish);
  });

  if (isTauri()) {
    void import("@tauri-apps/api/event")
      .then(({ listen }) => listen<string | null>("eqlsky://persist", (ev) => apply(ev.payload)))
      .catch(() => {});
  }
}
