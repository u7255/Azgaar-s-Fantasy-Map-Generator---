// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  export: vi.fn()
}));

vi.mock("@/model/localization/novel-gazetteer", async importOriginal => ({
  ...(await importOriginal<typeof import("@/model/localization/novel-gazetteer")>()),
  buildNovelGazetteer: mocks.build
}));

vi.mock("@/services/io/novel-gazetteer", async importOriginal => ({
  ...(await importOriginal<typeof import("@/services/io/novel-gazetteer")>()),
  exportNovelGazetteer: mocks.export
}));

import { Dialog } from "@/ui/dialog/dialog";
import { NovelGazetteer } from "./novel-gazetteer";

const documentData = {
  title: "Valcaia",
  originalTitle: "Valcaia",
  mode: "zh" as const,
  includePreview: false,
  entries: [
    {
      typeKey: "state" as const,
      type: "State",
      chineseName: "瓦尔卡亚",
      originalName: "Valcaia",
      displayName: "瓦尔卡亚",
      pinyin: "Wǎ'ěrkǎyà",
      aliases: [],
      country: "瓦尔卡亚",
      province: "",
      population: 100,
      noteSummary: "A realm.",
      relatedEntities: []
    }
  ]
};

beforeEach(() => {
  document.body.innerHTML = '<div id="dialogs"></div><svg id="viewbox"></svg>';
  document.head.querySelector("#novelGazetteerStyles")?.remove();
  mocks.build.mockReturnValue(documentData);
  mocks.export.mockReturnValue("Valcaia Novel Gazetteer.json");
});

afterEach(() => {
  Dialog.closeAll();
  vi.clearAllMocks();
});

describe("novel gazetteer panel", () => {
  it("defaults to Markdown, Chinese and no unconfirmed previews", () => {
    NovelGazetteer.open();

    expect((document.getElementById("novelGazetteerFormat") as HTMLSelectElement).value).toBe("markdown");
    expect((document.getElementById("novelGazetteerMode") as HTMLSelectElement).value).toBe("zh");
    expect((document.getElementById("novelGazetteerIncludePreview") as HTMLInputElement).checked).toBe(false);
    expect(mocks.build).toHaveBeenLastCalledWith({ mode: "zh", includePreview: false });
    expect(document.querySelector(".novel-summary")?.textContent).toContain("1");
  });

  it("passes explicit format, mode and preview choices to the exporter", () => {
    NovelGazetteer.open();
    const format = document.getElementById("novelGazetteerFormat") as HTMLSelectElement;
    format.value = "json";
    format.dispatchEvent(new Event("change", { bubbles: true }));

    const mode = document.getElementById("novelGazetteerMode") as HTMLSelectElement;
    mode.value = "bilingual";
    mode.dispatchEvent(new Event("change", { bubbles: true }));

    const preview = document.getElementById("novelGazetteerIncludePreview") as HTMLInputElement;
    preview.checked = true;
    preview.dispatchEvent(new Event("change", { bubbles: true }));
    (document.getElementById("novelGazetteerExport") as HTMLButtonElement).click();

    expect(mocks.build).toHaveBeenLastCalledWith({ mode: "bilingual", includePreview: true });
    expect(mocks.export).toHaveBeenCalledWith(expect.objectContaining({ entries: documentData.entries }), "json");
    expect(document.querySelector(".novel-status")?.textContent).toContain("Valcaia Novel Gazetteer.json");
  });

  it("disables export when there are no entities", () => {
    mocks.build.mockReturnValue({ ...documentData, entries: [] });
    NovelGazetteer.open();

    expect((document.getElementById("novelGazetteerExport") as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector(".novel-status")?.textContent).toContain("No entities to export");
  });
});
