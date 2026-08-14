import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MenuApp } from "./menu/MenuApp";
import { useSky } from "./logic/store";
import { openOverlayWindow } from "./tauri";
import { bindProgressSync } from "./sync";
import "./styles.css";

bindProgressSync();

function Hotkeys() {
  const overlayVisible = useSky((s) => s.overlayVisible);
  const overlayLocked = useSky((s) => s.overlayLocked);
  useEffect(() => {
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
  }, [overlayVisible, overlayLocked]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Hotkeys />
    <MenuApp />
  </StrictMode>
);
