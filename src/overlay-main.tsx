import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { OverlayWindow } from "./overlay/OverlayWindow";
import { useSky } from "./logic/store";
import { bindHotkeys, bindOverlayBridge } from "./overlay/bridge";
import { bindProgressSync } from "./sync";
import "./styles.css";

bindProgressSync();

function OverlayRoot() {
  useEffect(() => {
    const boot = () => {
      useSky.getState().setHydrated();
      useSky.setState({ overlayVisible: true, overlayPopout: true });
    };
    const unsubHydrate = useSky.persist.onFinishHydration(boot);
    if (useSky.persist.hasHydrated()) boot();
    const unsubHotkeys = bindHotkeys();
    const unsubOverlay = bindOverlayBridge();
    return () => {
      unsubHydrate();
      unsubHotkeys();
      unsubOverlay();
    };
  }, []);
  return <OverlayWindow />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OverlayRoot />
  </StrictMode>
);
