import { describe, expect, it } from "vitest";
import {
  createDefaultWindowState,
  fitWindowStateToWorkArea,
  makeWindowState,
  normalizeWindowState,
  WINDOW_STATE_VERSION
} from "./window-state";

const workArea = { x: 0, y: 0, width: 1920, height: 1080 };

describe("window state", () => {
  it("opens a new install in a centered window", () => {
    expect(createDefaultWindowState(workArea)).toEqual({
      version: WINDOW_STATE_VERSION,
      bounds: { x: 240, y: 90, width: 1440, height: 900 },
      mode: "normal"
    });
  });

  it("keeps a default window inside a small work area", () => {
    const state = createDefaultWindowState({ x: 100, y: 50, width: 1000, height: 700 });
    expect(state.bounds).toEqual({ x: 150, y: 85, width: 900, height: 630 });
  });

  it("restores the saved normal bounds and mode", () => {
    const state = normalizeWindowState(
      { version: WINDOW_STATE_VERSION, bounds: { x: 20, y: 30, width: 1200, height: 800 }, mode: "maximized" },
      workArea
    );
    expect(state).toEqual({
      version: WINDOW_STATE_VERSION,
      bounds: { x: 20, y: 30, width: 1200, height: 800 },
      mode: "maximized"
    });
  });

  it("migrates an old fullscreen state to a maximized window", () => {
    const state = normalizeWindowState(
      { width: 1280, height: 720, x: 20, y: 30, maximized: false, fullscreen: true },
      workArea
    );
    expect(state.mode).toBe("maximized");
    expect(state.bounds).toEqual({ x: 20, y: 30, width: 1280, height: 720 });
  });

  it("migrates an old maximized state without changing its normal bounds", () => {
    const state = normalizeWindowState(
      { width: 1280, height: 720, x: 20, y: 30, maximized: true, fullscreen: false },
      workArea
    );
    expect(state.mode).toBe("maximized");
  });

  it("keeps saved bounds that belong to a secondary display", () => {
    const state = normalizeWindowState(
      { version: WINDOW_STATE_VERSION, bounds: { x: 2200, y: 120, width: 1200, height: 800 }, mode: "normal" },
      workArea
    );
    expect(state.bounds).toEqual({ x: 2200, y: 120, width: 1200, height: 800 });
  });

  it("falls back to a new window for missing or malformed state", () => {
    expect(normalizeWindowState(null, workArea)).toEqual(createDefaultWindowState(workArea));
    expect(normalizeWindowState({ width: 0, height: 720 }, workArea)).toEqual(createDefaultWindowState(workArea));
  });

  it("brings an off-screen window back into the work area", () => {
    const state = makeWindowState({ x: 5000, y: -400, width: 1200, height: 900 }, false, false);
    expect(fitWindowStateToWorkArea(state, workArea).bounds).toEqual({
      x: 720,
      y: 0,
      width: 1200,
      height: 900
    });
  });

  it("does not serialize the maximized screen bounds as the normal bounds", () => {
    expect(makeWindowState({ x: 10, y: 20, width: 1000, height: 700 }, true, false)).toMatchObject({
      bounds: { x: 10, y: 20, width: 1000, height: 700 },
      mode: "maximized"
    });
  });
});
