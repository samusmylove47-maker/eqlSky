type TextCb = (text: string, incremental: boolean) => void;

export interface Watcher {
  stop: () => void;
  label: string;
}

async function pickFile(): Promise<{ name: string; getFile: () => Promise<File> }> {
  const w = window as unknown as {
    showOpenFilePicker?: (opts?: unknown) => Promise<Array<{ name: string; getFile: () => Promise<File> }>>;
  };
  if (!w.showOpenFilePicker) {
    throw new Error("Live watch needs Chrome/Edge (file picker with re-read) or the Tauri app.");
  }
  const [handle] = await w.showOpenFilePicker({
    types: [{ description: "Text", accept: { "text/plain": [".txt", ".log"] } }],
    multiple: false,
  });
  return handle;
}

export async function watchTextFile(onText: TextCb, opts: { liveOnly?: boolean } = {}): Promise<Watcher> {
  const handle = await pickFile();
  let lastMod = 0;
  let lastLen = 0;
  let primed = false;
  const tick = async () => {
    const file = await handle.getFile();
    if (file.lastModified === lastMod && file.size === lastLen) return;
    const text = await file.text();
    lastMod = file.lastModified;
    lastLen = file.size;
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
