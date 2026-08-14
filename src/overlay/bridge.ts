import { listen } from "@tauri-apps/api/event";
import { useSky } from "../logic/store";
import {
  isTauri,
  setOverlayClickThrough,
  setOverlayVisible,
  showMenuWindow,
} from "../tauri";

export function bindOverlayBridge(): () => void {
  if (!isTauri()) return () => {};

  let lastVisible = useSky.getState().overlayVisible;
  let lastLocked = useSky.getState().overlayLocked;

  const unsub = useSky.subscribe((s) => {
    if (s.overlayVisible !== lastVisible) {
      lastVisible = s.overlayVisible;
      void setOverlayVisible(s.overlayVisible);
    }
    if (s.overlayLocked !== lastLocked) {
      lastLocked = s.overlayLocked;
      void setOverlayClickThrough(s.overlayLocked);
    }
  });

  const jobs = [
    listen<boolean>("eqlsky://overlay-visible", (ev) => {
      if (useSky.getState().overlayVisible !== ev.payload) {
        lastVisible = ev.payload;
        useSky.setState({ overlayVisible: ev.payload, overlayPopout: true });
      }
    }),
    listen<boolean>("eqlsky://overlay-locked", (ev) => {
      if (useSky.getState().overlayLocked !== ev.payload) {
        lastLocked = ev.payload;
        useSky.setState({ overlayLocked: ev.payload });
      }
    }),
  ];

  return () => {
    unsub();
    for (const job of jobs) void job.then((unlisten) => unlisten());
  };
}

export function bindHotkeys() {
  const nativeWindowsHotkeys = isTauri() && /Windows/i.test(navigator.userAgent);
  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey && e.shiftKey)) return;
    if (nativeWindowsHotkeys && (e.code === "KeyO" || e.code === "KeyL" || e.code === "KeyM")) return;
    if (e.code === "KeyO") {
      e.preventDefault();
      useSky.getState().setOverlayVisible(!useSky.getState().overlayVisible);
    }
    if (e.code === "KeyL") {
      e.preventDefault();
      useSky.getState().setOverlayLocked(!useSky.getState().overlayLocked);
    }
    if (e.code === "KeyM") {
      e.preventDefault();
      void showMenuWindow();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
