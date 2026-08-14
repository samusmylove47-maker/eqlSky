export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isOverlayWindow(): boolean {
  return typeof window !== "undefined" && /overlay\.html/i.test(window.location.pathname);
}

export async function setClickThrough(locked: boolean): Promise<void> {
  if (!isTauri() || !isOverlayWindow()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setIgnoreCursorEvents(locked);
  } catch {
    /* overlay chrome still works via CSS lock */
  }
}

export async function openOverlayWindow(): Promise<void> {
  if (!isTauri()) {
    window.open("/overlay.html", "eqlsky-overlay", "width=380,height=560");
    return;
  }
  try {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const existing = await WebviewWindow.getByLabel("overlay");
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    new WebviewWindow("overlay", {
      url: "overlay.html",
      title: "eqlSky overlay",
      width: 380,
      height: 560,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: true,
    });
  } catch {
    window.open("/overlay.html", "eqlsky-overlay", "width=380,height=560");
  }
}
