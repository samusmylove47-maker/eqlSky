import { invoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isOverlayPath(pathname: string, href = ""): boolean {
  return /overlay\.html/i.test(pathname) || /overlay\.html/i.test(href);
}

export function isOverlayWindow(): boolean {
  if (typeof window === "undefined") return false;
  return isOverlayPath(window.location.pathname, window.location.href);
}

export async function setOverlayVisible(visible: boolean): Promise<void> {
  if (!isTauri()) return;
  await invoke("overlay_set_visible", { visible });
}

export async function setOverlayClickThrough(locked: boolean): Promise<void> {
  if (!isTauri()) return;
  await invoke("overlay_set_click_through", { locked });
}

export async function showMenuWindow(): Promise<void> {
  if (!isTauri()) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const menu = await WebviewWindow.getByLabel("menu");
  if (!menu) return;
  await menu.show();
  await menu.unminimize();
  await menu.setFocus();
}

export async function openOverlayWindow(): Promise<void> {
  if (!isTauri()) {
    window.open("/overlay.html", "eqlsky-overlay", "width=380,height=560");
    return;
  }
  await setOverlayVisible(true);
}

export async function readWatchedText(path: string): Promise<string> {
  return invoke<string>("read_text_path", { path });
}

export async function statWatchedText(path: string): Promise<{ size: number; modified: number }> {
  return invoke("stat_text_path", { path });
}

export async function pickWatchedTextFile(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    filters: [{ name: "Text", extensions: ["txt", "log"] }],
  });
  if (!selected) return null;
  return Array.isArray(selected) ? selected[0] ?? null : selected;
}
