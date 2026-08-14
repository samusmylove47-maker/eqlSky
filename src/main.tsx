import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MenuApp } from "./menu/MenuApp";
import { useSky } from "./logic/store";
import { openOverlayWindow } from "./tauri";
import { bindProgressSync } from "./sync";
import "./styles.css";

bindProgressSync();

function bindHotkeys() {
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyO") {
      e.preventDefault();
      const s = useSky.getState();
      if (e.altKey) {
        s.setOverlayPopout(true);
        void openOverlayWindow();
        return;
      }
      s.setOverlayVisible(!s.overlayVisible);
    }
    if (e.ctrlKey && e.shiftKey && e.code === "KeyL") {
      e.preventDefault();
      useSky.getState().setOverlayLocked(!useSky.getState().overlayLocked);
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

function Hotkeys() {
  useEffect(() => bindHotkeys(), []);
  return null;
}

function Root() {
  useEffect(() => {
    const finish = () => useSky.getState().setHydrated();
    const unsub = useSky.persist.onFinishHydration(finish);
    if (useSky.persist.hasHydrated()) finish();
    return unsub;
  }, []);
  return (
    <>
      <Hotkeys />
      <MenuApp />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
