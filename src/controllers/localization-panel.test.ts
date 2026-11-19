// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  drawLabels: vi.fn(),
  save: vi.fn(),
  redraw3d: vi.fn(),
  is3dView: vi.fn(() => false),
  openGazetteer: vi.fn()
}));

vi.mock("@/renderers/labels/labels-renderer", () => ({ drawLabels: mocks.drawLabels }));
vi.mock("@/renderers/view-mode", () => ({ is3dView: mocks.is3dView }));
vi.mock("@/model/options/options-model", () => ({ Options: { save: mocks.save } }));
vi.mock("@/controllers", () => ({ Controllers: { View3d: { redraw: mocks.redraw3d } } }));
vi.mock("@/controllers/novel-gazetteer", () => ({ NovelGazetteer: { open: mocks.openGazetteer } }));

import { createLocalizedName } from "@/model/localization/localized-names";
import { nameReview } from "@/model/localization/name-review";
import { Dialog } from "@/ui/dialog/dialog";
import { LOCALIZATION_CHANGED_EVENT } from "@/ui/entity-name";
import { LocalizationPanel } from "./localization-panel";

beforeEach(() => {
  document.body.innerHTML = '<div id="dialogs"></div><svg id="viewbox"></svg>';
  document.head.querySelector("#localizationPanelStyles")?.remove();
  globalThis.options = {
    map: {
      localization: { displayMode: "zh", mapFont: "song-ke", nameStyle: "western-medieval" }
    }
  } as typeof options;
  globalThis.pack = {
    states: [{ i: 0 }, { i: 1, name: "Ardenia", fullName: "Kingdom of Ardenia" }],
    provinces: [{ i: 0 }],
    burgs: [0],
    rivers: [0],
    routes: [],
    features: [0],
    markers: [],
    zones: [0],
    journeys: [],
    addedLabels: [],
    cells: { i: [0], p: [[0, 0]] },
    cultures: [],
    religions: [],
    biomes: [],
    markets: []
  } as unknown as typeof pack;
  options.map.goods = [];
  nameReview.discardPendingBatch();
  vi.clearAllMocks();
  mocks.is3dView.mockReturnValue(false);
});

afterEach(() => {
  Dialog.closeAll();
  nameReview.discardPendingBatch();
});

describe("deep localization panel", () => {
  it("renders the three display modes and redraws labels when mode or font changes", () => {
    LocalizationPanel.open();
    const panel = document.getElementById("localizationPanel")!;
    const mode = document.getElementById("localizationDisplayMode") as HTMLSelectElement;
    let font = document.getElementById("localizationMapFont") as HTMLSelectElement;

    expect(panel).not.toBeNull();
    expect(mode.options).toHaveLength(3);
    expect(font.options).toHaveLength(4);

    const refresh = vi.fn();
    window.addEventListener(LOCALIZATION_CHANGED_EVENT, refresh, { once: true });
    mode.value = "bilingual";
    mode.dispatchEvent(new Event("change", { bubbles: true }));
    expect(options.map.localization.displayMode).toBe("bilingual");
    expect(mocks.save).toHaveBeenCalled();
    expect(mocks.drawLabels).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();

    font = document.getElementById("localizationMapFont") as HTMLSelectElement;
    font.value = "wen-kai";
    font.dispatchEvent(new Event("change", { bubbles: true }));
    expect(options.map.localization.mapFont).toBe("wen-kai");
    expect(mocks.drawLabels).toHaveBeenCalledTimes(2);
  });

  it("offers every naming style and does not rewrite confirmed names when the style changes", () => {
    pack.states[1].localizedNames = {
      zh: createLocalizedName({
        text: "阿登尼亚",
        sourceName: "Ardenia",
        sourceFullName: "Kingdom of Ardenia",
        source: "manual",
        status: "confirmed"
      })
    };
    LocalizationPanel.open();
    vi.clearAllMocks();

    const style = document.getElementById("localizationNameStyle") as HTMLSelectElement;
    expect(style.options).toHaveLength(8);
    expect(style.value).toBe("western-medieval");
    style.value = "western-industrial";
    style.dispatchEvent(new Event("change", { bubbles: true }));

    expect(options.map.localization.nameStyle).toBe("western-industrial");
    expect(pack.states[1].localizedNames?.zh?.text).toBe("阿登尼亚");
    expect(mocks.save).toHaveBeenCalled();
    expect(mocks.drawLabels).not.toHaveBeenCalled();
  });

  it("generates missing names through the review store and offers batch undo", () => {
    LocalizationPanel.open();
    (document.getElementById("localizationGenerateMissing") as HTMLButtonElement).click();

    expect(pack.states[1].localizedNames?.zhPreview?.status).toBe("preview");
    expect(pack.states[1].localizedNames?.zh).toBeUndefined();
    expect((document.getElementById("localizationUndo") as HTMLButtonElement).disabled).toBe(false);

    (document.getElementById("localizationUndo") as HTMLButtonElement).click();
    expect(pack.states[1].localizedNames).toBeUndefined();
  });

  it("redraws an active 3D view after a font change", () => {
    mocks.is3dView.mockReturnValue(true);
    LocalizationPanel.open();
    const font = document.getElementById("localizationMapFont") as HTMLSelectElement;
    font.value = "xing-shu";
    font.dispatchEvent(new Event("change", { bubbles: true }));

    expect(options.map.localization.mapFont).toBe("xing-shu");
    expect(mocks.drawLabels).toHaveBeenCalled();
    expect(mocks.redraw3d).toHaveBeenCalled();
  });

  it("skips an over-hard preview in a batch until force long names is selected", () => {
    pack.states[1].localizedNames = {
      zhPreview: createLocalizedName({
        text: "这是一个超过八个汉字的国家名称",
        sourceName: "Ardenia",
        sourceFullName: "Kingdom of Ardenia",
        source: "transliteration",
        status: "preview"
      })
    };
    LocalizationPanel.open();
    expect((document.getElementById("localizationForceLongNames") as HTMLInputElement).checked).toBe(false);

    (document.getElementById("localizationApplyPreviews") as HTMLButtonElement).click();
    expect(pack.states[1].localizedNames?.zh).toBeUndefined();
    expect(document.getElementById("localizationPanelStatus")?.textContent).toContain("hard limit");

    const force = document.getElementById("localizationForceLongNames") as HTMLInputElement;
    force.checked = true;
    force.dispatchEvent(new Event("change", { bubbles: true }));
    (document.getElementById("localizationApplyPreviews") as HTMLButtonElement).click();
    expect(pack.states[1].localizedNames?.zh?.text).toBe("这是一个超过八个汉字的国家名称");
  });

  it("keeps a corrupt extension from breaking the table", () => {
    (pack.states[1] as unknown as { localizedNames: unknown }).localizedNames = "broken";
    expect(() => LocalizationPanel.open()).not.toThrow();
    expect(document.getElementById("localizationPanel")?.textContent).toContain("Ardenia");
  });

  it("opens the novel gazetteer from its enabled panel entry", () => {
    LocalizationPanel.open();
    const entry = document.getElementById("localizationGazetteer") as HTMLButtonElement;

    expect(entry.disabled).toBe(false);
    entry.click();
    expect(mocks.openGazetteer).toHaveBeenCalledOnce();
  });
});
