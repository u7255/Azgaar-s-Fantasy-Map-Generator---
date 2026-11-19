// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/renderers/layers", () => ({ Layers: { show: vi.fn(), draw: vi.fn() } }));
vi.mock("@/renderers/draw-routes", () => ({ getRouteBox: vi.fn() }));
vi.mock("@/ui/map/highlight", () => ({ highlightArea: vi.fn() }));
vi.mock("@/ui/tooltips", () => ({ tip: vi.fn() }));
vi.mock("@/controllers", () => ({ Controllers: {} }));

import { createLocalizedName } from "@/model/localization/localized-names";
import { Dialog } from "@/ui/dialog/dialog";
import { DIALOGS_MARKUP } from "@/ui/dialog/dialog-testing";
import { LOCALIZATION_CHANGED_EVENT } from "@/ui/entity-name";
import { RoutesOverview } from "./routes-overview";

beforeEach(() => {
  document.body.innerHTML = `<svg></svg>${DIALOGS_MARKUP}`;
  globalThis.options = {
    app: { mode: null },
    map: {
      goods: [],
      localization: { displayMode: "zh" },
      units: { distance: { scale: 1, unit: "mi" } }
    }
  } as unknown as typeof options;
  globalThis.pack = {
    routes: [
      {
        i: 0,
        name: "King's Road",
        group: "roads",
        length: 12,
        points: [
          [0, 0, 0],
          [1, 1, 1]
        ],
        tags: [],
        localizedNames: {
          zh: createLocalizedName({ text: "国王大道", sourceName: "King's Road" })
        }
      }
    ],
    cells: { h: [20, 20] }
  } as unknown as typeof pack;
});

describe("RoutesOverview localization", () => {
  it("shows the Chinese route name without changing the source", () => {
    RoutesOverview.open();

    const row = document.querySelector('#routesBody .states[data-id="0"]') as HTMLElement;
    expect(row.querySelector<HTMLInputElement>('[data-col="name"]')?.value).toBe("国王大道");
    expect(pack.routes[0].name).toBe("King's Road");
  });

  it("refreshes an open overview when the display mode changes", () => {
    RoutesOverview.open();

    options.map.localization = { displayMode: "source" } as typeof options.map.localization;
    window.dispatchEvent(new Event(LOCALIZATION_CHANGED_EVENT));

    const row = document.querySelector('#routesBody .states[data-id="0"]') as HTMLElement;
    expect(row.querySelector<HTMLInputElement>('[data-col="name"]')?.value).toBe("King's Road");
  });
});

afterEach(() => {
  Dialog.destroy("routesOverview");
});
