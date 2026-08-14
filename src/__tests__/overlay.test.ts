import { describe, expect, it } from "vitest";
import { fileChanged } from "../ingest/watch";
import { shouldApplyRemotePersist } from "../sync";
import { isOverlayPath } from "../tauri";

describe("overlay window detection", () => {
  it("treats overlay.html as the HUD page", () => {
    expect(isOverlayPath("/overlay.html")).toBe(true);
    expect(isOverlayPath("/overlay.html", "http://localhost:1420/overlay.html")).toBe(true);
    expect(isOverlayPath("/")).toBe(false);
    expect(isOverlayPath("/", "http://localhost:1420/")).toBe(false);
  });
});

describe("live file watch", () => {
  it("re-reads when mtime or size changes", () => {
    expect(fileChanged({ mod: 1, len: 10 }, { mod: 1, len: 10 })).toBe(false);
    expect(fileChanged({ mod: 1, len: 10 }, { mod: 2, len: 10 })).toBe(true);
    expect(fileChanged({ mod: 1, len: 10 }, { mod: 1, len: 11 })).toBe(true);
  });
});

describe("menu/overlay persist sync", () => {
  it("applies a remote snapshot only when it differs", () => {
    expect(shouldApplyRemotePersist(null, null)).toBe(false);
    expect(shouldApplyRemotePersist("{}", "{}")).toBe(false);
    expect(shouldApplyRemotePersist("{}", '{"x":1}')).toBe(true);
    expect(shouldApplyRemotePersist(null, '{"x":1}')).toBe(true);
  });
});
