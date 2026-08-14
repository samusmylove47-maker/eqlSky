import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { OverlayWindow } from "./overlay/OverlayWindow";
import { useSky } from "./logic/store";
import { bindProgressSync } from "./sync";
import "./styles.css";

bindProgressSync();

function OverlayRoot() {
  useEffect(() => {
    const boot = () => {
      useSky.getState().setHydrated();
      useSky.setState({ overlayVisible: true, overlayPopout: true });
    };
    const unsub = useSky.persist.onFinishHydration(boot);
    if (useSky.persist.hasHydrated()) boot();
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyO") {
        e.preventDefault();
        useSky.getState().setOverlayVisible(!useSky.getState().overlayVisible);
      }
      if (e.ctrlKey && e.shiftKey && e.code === "KeyL") {
        e.preventDefault();
        useSky.getState().setOverlayLocked(!useSky.getState().overlayLocked);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unsub();
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return <OverlayWindow />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OverlayRoot />
  </StrictMode>
);
