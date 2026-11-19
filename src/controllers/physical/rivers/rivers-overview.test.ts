// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/renderers/layers", () => ({ Layers: { show: vi.fn(), draw: vi.fn() } }));
vi.mock("@/renderers/draw-rivers", () => ({ getRiverBox: vi.fn(), toggleBasinHighlight: vi.fn() }));
vi.mock("@/ui/dialog/highlighting", () => ({ applyLineHighlighting: vi.fn() }));
vi.mock("@/ui/map/highlight", () => ({ highlightArea: vi.fn() }));
vi.mock("@/ui/tooltips", () => ({ tip: vi.fn() }));
vi.mock("@/controllers", () => ({ Controllers: {} }));

import { createLocalizedName } from "@/model/localization/localized-names";
import { Dialog } from "@/ui/dialog/dialog";
import { DIALOGS_MARKUP } from "@/ui/dialog/dialog-testing";
import { LOCALIZATION_CHANGED_EVENT } from "@/ui/entity-name";
import { RiversOverview } from "./rivers-overview";

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
    cells: { r: [0, 1], i: [0], h: [20] },
    rivers: [
      { i: 0, name: "Marine" },
      {
        i: 1,
        name: "Alder",
        type: "River",
        group: "main",
        discharge: 10,
        length: 20,
        width: 2,
        basin: 1,
        tags: [],
        localizedNames: {
          zh: createLocalizedName({ text: "赤杨河", sourceName: "Alder" })
        }
      }
    ]
  } as unknown as typeof pack;
});

describe("RiversOverview localization", () => {
  it("shows the Chinese name and basin while keeping source values", () => {
    RiversOverview.open();

    const row = document.querySelector('#riversBody .states[data-id="1"]') as HTMLElement;
    expect(row.querySelector<HTMLInputElement>('[data-col="name"]')?.value).toBe("赤杨河");
    expect(row.querySelector<HTMLInputElement>('[data-col="basin"]')?.value).toBe("赤杨河");
    expect(pack.rivers[1]).toMatchObject({ name: "Alder", basin: 1 });
  });

  it("refreshes an open overview when the display mode changes", () => {
    RiversOverview.open();

    options.map.localization = { displayMode: "source" } as typeof options.map.localization;
    window.dispatchEvent(new Event(LOCALIZATION_CHANGED_EVENT));

    const row = document.querySelector('#riversBody .states[data-id="1"]') as HTMLElement;
    expect(row.querySelector<HTMLInputElement>('[data-col="name"]')?.value).toBe("Alder");
  });
});

afterEach(() => {
  Dialog.destroy("riversOverview");
});
