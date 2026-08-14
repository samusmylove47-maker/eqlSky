import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MenuApp } from "./menu/MenuApp";
import { useSky } from "./logic/store";
import { bindHotkeys, bindOverlayBridge } from "./overlay/bridge";
import { bindProgressSync } from "./sync";
import { isTauri, setOverlayVisible } from "./tauri";
import "./styles.css";

bindProgressSync();

function Root() {
  useEffect(() => {
    const finish = () => useSky.getState().setHydrated();
    const unsubHydrate = useSky.persist.onFinishHydration(finish);
    if (useSky.persist.hasHydrated()) finish();
    const unsubHotkeys = bindHotkeys();
    const unsubOverlay = bindOverlayBridge();
    if (isTauri()) {
      useSky.setState({ overlayVisible: true, overlayPopout: true });
      void setOverlayVisible(true);
    }
    return () => {
      unsubHydrate();
      unsubHotkeys();
      unsubOverlay();
    };
  }, []);
  return <MenuApp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
