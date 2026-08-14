import { useEffect, useRef, type CSSProperties } from "react";
import { OverlayHud } from "../logic/OverlayHud";
import { useSky } from "../logic/store";
import { isTauri, setClickThrough } from "../tauri";

export function OverlayWindow() {
  const s = useSky();
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const resizing = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const embedded = !isTauri() && !s.overlayPopout;

  useEffect(() => {
    void setClickThrough(s.overlayLocked);
  }, [s.overlayLocked]);

  if (!s.overlayVisible) return null;

  const style: CSSProperties = embedded
    ? {
        left: s.overlayPos.x,
        top: s.overlayPos.y,
        width: s.overlaySize.w,
        height: s.overlaySize.h,
        opacity: s.overlayOpacity / 100,
        transform: `scale(${s.overlayScale / 100})`,
        transformOrigin: "top left",
        background: `color-mix(in srgb, #141210 ${s.overlayOpacity}%, transparent)`,
      }
    : {
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: s.overlayOpacity / 100,
        background: `color-mix(in srgb, #141210 ${Math.max(s.overlayOpacity, 35)}%, transparent)`,
      };

  return (
    <div
      className={`overlay-frame ${s.overlayLocked ? "locked" : ""}`}
      style={style}
    >
      <div
        className="overlay-chrome"
        data-tauri-drag-region
        onPointerDown={(e) => {
          if (!embedded || s.overlayLocked) return;
          dragging.current = { x: e.clientX - s.overlayPos.x, y: e.clientY - s.overlayPos.y };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          s.setOverlayPos({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
      >
        <strong className="brand" style={{ fontSize: 16 }}>
          eqlSky
        </strong>
        <span className="grow" />
        <span className="range">
          {s.overlayOpacity}%
          <input
            type="range"
            min={20}
            max={100}
            value={s.overlayOpacity}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => s.setOpacity(Number(e.target.value))}
          />
        </span>
        <button className={`btn ${s.overlayLocked ? "on" : ""}`} onClick={() => s.setOverlayLocked(!s.overlayLocked)}>
          {s.overlayLocked ? "Locked" : "Lock"}
        </button>
        <button className="btn" onClick={() => s.setOverlayVisible(false)}>
          Hide
        </button>
      </div>
      <OverlayHud />
      {embedded ? (
        <div
          className="resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            resizing.current = { x: e.clientX, y: e.clientY, w: s.overlaySize.w, h: s.overlaySize.h };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!resizing.current) return;
            s.setOverlaySize({
              w: Math.max(260, resizing.current.w + (e.clientX - resizing.current.x)),
              h: Math.max(180, resizing.current.h + (e.clientY - resizing.current.y)),
            });
          }}
          onPointerUp={() => {
            resizing.current = null;
          }}
        />
      ) : null}
    </div>
  );
}
