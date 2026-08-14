import { useEffect, useRef, type CSSProperties } from "react";
import { OverlayHud } from "../logic/OverlayHud";
import { useSky } from "../logic/store";
import { isOverlayWindow, isTauri, setClickThrough } from "../tauri";

export function OverlayWindow() {
  const s = useSky();
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const resizing = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const overlayPage = isOverlayWindow();
  const embedded = !overlayPage;

  useEffect(() => {
    if (overlayPage && isTauri()) void setClickThrough(s.overlayLocked);
  }, [overlayPage, s.overlayLocked]);

  if (!s.overlayVisible && overlayPage) {
    return (
      <div className="overlay-frame" style={{ inset: 0, background: "#141210" }}>
        <div className="overlay-chrome">
          <strong className="brand" style={{ fontSize: 16 }}>eqlSky</strong>
          <button className="btn" onClick={() => s.setOverlayVisible(true)}>Show</button>
        </div>
      </div>
    );
  }
  if (!s.overlayVisible) return null;

  const bg = `rgba(20, 18, 16, ${s.overlayOpacity / 100})`;
  const style: CSSProperties = embedded
    ? {
        left: s.overlayPos.x,
        top: s.overlayPos.y,
        width: s.overlaySize.w,
        height: s.overlaySize.h,
        background: bg,
        transform: `scale(${s.overlayScale / 100})`,
        transformOrigin: "top left",
      }
    : {
        inset: 0,
        width: "100%",
        height: "100%",
        background: bg,
      };

  return (
    <div className={`overlay-frame ${s.overlayLocked ? "locked" : ""}`} style={style}>
      <div
        className="overlay-chrome"
        data-tauri-drag-region
        onPointerDown={(e) => {
          if (!embedded || s.overlayLocked) return;
          if ((e.target as HTMLElement).closest("button, input, label")) return;
          dragging.current = { x: e.clientX - s.overlayPos.x, y: e.clientY - s.overlayPos.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          s.setOverlayPos({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
      >
        <strong className="brand" style={{ fontSize: 16 }} data-tauri-drag-region>
          eqlSky
        </strong>
        <span className="grow" data-tauri-drag-region />
        <label className="range" data-tauri-drag-region="false">
          {s.overlayOpacity}%
          <input
            type="range"
            min={20}
            max={100}
            value={s.overlayOpacity}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => s.setOpacity(Number(e.target.value))}
          />
        </label>
        <label className="help" data-tauri-drag-region="false">
          <input type="checkbox" checked={s.showObtained} onChange={(e) => s.setShowObtained(e.target.checked)} />
          have
        </label>
        <button
          className={`btn ${s.overlayLocked ? "on" : ""}`}
          data-tauri-drag-region="false"
          onClick={() => s.setOverlayLocked(!s.overlayLocked)}
        >
          {s.overlayLocked ? "Unlock" : "Lock"}
        </button>
        <button className="btn" data-tauri-drag-region="false" onClick={() => s.setOverlayVisible(false)}>
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
