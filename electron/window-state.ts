export const WINDOW_STATE_VERSION = 2;
export const MIN_WINDOW_WIDTH = 800;
export const MIN_WINDOW_HEIGHT = 600;

export type WindowMode = "normal" | "maximized" | "fullscreen";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  version: typeof WINDOW_STATE_VERSION;
  bounds: WindowBounds;
  mode: WindowMode;
}

type WindowStateInput = Partial<{
  version: number;
  bounds: Partial<WindowBounds>;
  mode: WindowMode;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  fullscreen: boolean;
}>;

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isMode = (value: unknown): value is WindowMode =>
  value === "normal" || value === "maximized" || value === "fullscreen";

const centeredBounds = (width: number, height: number, workArea: WorkArea): WindowBounds => ({
  x: Math.round(workArea.x + (workArea.width - width) / 2),
  y: Math.round(workArea.y + (workArea.height - height) / 2),
  width,
  height
});

/** The first run: a useful large window, centered and never larger than the available display */
export function createDefaultWindowState(workArea: WorkArea): WindowState {
  const width = Math.max(1, Math.min(1440, Math.floor(workArea.width * 0.9)));
  const height = Math.max(1, Math.min(900, Math.floor(workArea.height * 0.9)));
  return {
    version: WINDOW_STATE_VERSION,
    bounds: centeredBounds(width, height, workArea),
    mode: "normal"
  };
}

/** Keep a restored window title bar reachable after a display is removed or its work area changes */
export function fitWindowStateToWorkArea(state: WindowState, workArea: WorkArea): WindowState {
  const width = Math.max(1, Math.min(state.bounds.width, workArea.width));
  const height = Math.max(1, Math.min(state.bounds.height, workArea.height));
  const x = Math.min(Math.max(state.bounds.x, workArea.x), workArea.x + workArea.width - width);
  const y = Math.min(Math.max(state.bounds.y, workArea.y), workArea.y + workArea.height - height);
  return {
    version: WINDOW_STATE_VERSION,
    bounds: { x, y, width, height },
    mode: state.mode
  };
}

/**
 * Read the current state or the one written before state versioning.
 * Existing fullscreen users move to a maximized window once, matching the Chinese edition's default.
 */
export function normalizeWindowState(raw: unknown, workArea: WorkArea): WindowState {
  const fallback = createDefaultWindowState(workArea);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;

  const input = raw as WindowStateInput;
  const sourceBounds =
    input.bounds && typeof input.bounds === "object" && !Array.isArray(input.bounds) ? input.bounds : input;
  const width = isFiniteNumber(sourceBounds.width) ? sourceBounds.width : undefined;
  const height = isFiniteNumber(sourceBounds.height) ? sourceBounds.height : undefined;
  if (!width || !height) return fallback;

  const x = isFiniteNumber(sourceBounds.x) ? sourceBounds.x : fallback.bounds.x;
  const y = isFiniteNumber(sourceBounds.y) ? sourceBounds.y : fallback.bounds.y;
  const mode =
    isMode(input.mode) && input.version === WINDOW_STATE_VERSION
      ? input.mode
      : input.fullscreen
        ? "maximized"
        : input.maximized
          ? "maximized"
          : "normal";

  // Keep the saved position intact until main can match it to a display. Fitting to the primary
  // monitor here would move valid windows saved on a secondary monitor back to the primary one.
  return {
    version: WINDOW_STATE_VERSION,
    bounds: { x, y, width, height },
    mode
  };
}

export function makeWindowState(bounds: WindowBounds, maximized: boolean, fullscreen: boolean): WindowState {
  return {
    version: WINDOW_STATE_VERSION,
    bounds,
    mode: fullscreen ? "fullscreen" : maximized ? "maximized" : "normal"
  };
}
