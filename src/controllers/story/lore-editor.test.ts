// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { createLocalizedName } from "@/model/localization/localized-names";
import { Dialog } from "@/ui/dialog/dialog";
import { LoreEditor } from "./lore-editor";

beforeEach(() => {
  document.body.innerHTML = '<div id="dialogs"></div><svg id="svg"></svg>';
  localStorage.clear();
  globalThis.options = {
    app: { mode: null },
    map: {
      lore: {
        name: "Valcaia",
        localizedNames: { zh: createLocalizedName({ text: "瓦尔卡亚", sourceName: "Valcaia" }) },
        description: "The author's free text.",
        calendar: { year: 1000, era: "Era", eraShort: "E" }
      },
      localization: { displayMode: "zh", mapFont: "song-ke" }
    }
  } as unknown as typeof options;
});

afterEach(() => Dialog.closeAll());

it("keeps the editable original title and shows the Chinese title separately", () => {
  LoreEditor.open();
  expect((document.getElementById("loreMapName") as HTMLInputElement).value).toBe("Valcaia");
  expect((document.getElementById("loreDisplayName") as HTMLInputElement).value).toBe("瓦尔卡亚");
  expect(document.querySelector(".dialog-title")?.textContent).toContain("瓦尔卡亚");
});

it("does not write Chinese into the map title when the display mode changes", () => {
  options.map.localization.displayMode = "source";
  LoreEditor.open();
  expect((document.getElementById("loreMapName") as HTMLInputElement).value).toBe("Valcaia");
  expect(options.map.lore.name).toBe("Valcaia");
  expect(options.map.lore.description).toBe("The author's free text.");
});
