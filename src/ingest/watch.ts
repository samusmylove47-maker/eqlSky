type TextCb = (text: string, incremental: boolean) => void;

export interface Watcher {
  stop: () => void;
  label: string;
}

export function fileChanged(
  prev: { mod: number; len: number },
  next: { mod: number; len: number },
): boolean {
  return next.mod !== prev.mod || next.len !== prev.len;
}

function basename(path: string): string {
  return path.replace(/^.*[/\\]/, "") || path;
}

async function watchTauriPath(path: string, onText: TextCb, opts: { liveOnly?: boolean }): Promise<Watcher> {
  const { readWatchedText, statWatchedText } = await import("../tauri");
  let last = { mod: 0, len: 0 };
  let primed = false;
  const tick = async () => {
    const st = await statWatchedText(path);
    const next = { mod: st.modified, len: Number(st.size) };
    if (!fileChanged(last, next)) return;
    const text = await readWatchedText(path);
    last = next;
    if (!primed) {
      primed = true;
      if (opts.liveOnly) {
        onText(text.slice(Math.max(0, text.length - 1)), true);
        return;
      }
      onText(text, false);
      return;
    }
    onText(text, false);
  };
  await tick();
  const id = window.setInterval(() => void tick(), 1200);
  return {
    stop: () => window.clearInterval(id),
    label: basename(path),
  };
}

async function pickBrowserFile(): Promise<{ name: string; getFile: () => Promise<File> }> {
  const w = window as unknown as {
    showOpenFilePicker?: (opts?: unknown) => Promise<Array<{ name: string; getFile: () => Promise<File> }>>;
  };
  if (!w.showOpenFilePicker) {
    throw new Error("Live watch needs the Tauri app, or Chrome/Edge with a re-readable file picker.");
  }
  const [handle] = await w.showOpenFilePicker({
    types: [{ description: "Text", accept: { "text/plain": [".txt", ".log"] } }],
    multiple: false,
  });
  return handle;
}

export async function watchTextFile(onText: TextCb, opts: { liveOnly?: boolean } = {}): Promise<Watcher> {
  const { isTauri, pickWatchedTextFile } = await import("../tauri");
  if (isTauri()) {
    const path = await pickWatchedTextFile();
    if (!path) throw new Error("No file selected");
    return watchTauriPath(path, onText, opts);
  }

  const handle = await pickBrowserFile();
  let last = { mod: 0, len: 0 };
  let primed = false;
  const tick = async () => {
    const file = await handle.getFile();
    const next = { mod: file.lastModified, len: file.size };
    if (!fileChanged(last, next)) return;
    const text = await file.text();
    last = next;
    if (!primed) {
      primed = true;
      if (opts.liveOnly) {
        onText(text.slice(Math.max(0, text.length - 1)), true);
        return;
      }
      const slice = text.length > 2_000_000 ? text.slice(-2_000_000) : text;
      onText(slice, false);
      return;
    }
    onText(text, false);
  };
  await tick();
  const id = window.setInterval(() => void tick(), 1200);
  return {
    stop: () => window.clearInterval(id),
    label: handle.name,
  };
}
