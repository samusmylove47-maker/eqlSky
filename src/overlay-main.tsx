import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OverlayWindow } from "./overlay/OverlayWindow";
import { useSky } from "./logic/store";
import { bindProgressSync } from "./sync";
import "./styles.css";

bindProgressSync();

useSky.getState().setOverlayPopout(true);
useSky.getState().setOverlayVisible(true);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OverlayWindow />
  </StrictMode>
);
