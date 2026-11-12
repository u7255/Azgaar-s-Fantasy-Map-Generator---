// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalizedName } from "@/model/localization/localized-names";
import { localizedNameCsv, renderLocalizedNameCell } from "./entity-name";

beforeEach(() => {
  globalThis.options = {
    map: {
      goods: [],
      localization: { displayMode: "source", mapFont: "song-ke" }
    }
  } as unknown as typeof options;
  globalThis.pack = {
    states: [
      { i: 0 },
      {
        i: 1,
        name: "Ardenia",
        fullName: "Kingdom of Ardenia",
        localizedNames: {
          zh: createLocalizedName({ text: "雅登尼亚", sourceName: "Ardenia", sourceFullName: "Kingdom of Ardenia" })
        }
      }
    ],
    cells: { i: [0] }
  } as unknown as typeof pack;
});

describe("entity name presentation", () => {
  it("keeps the Chinese and original names separate even in source display mode", () => {
    const ref = { type: "state", id: 1 } as const;
    expect(localizedNameCsv(ref)).toEqual(["雅登尼亚", "Kingdom of Ardenia"]);
    expect(renderLocalizedNameCell(ref)).toContain("雅登尼亚");
  });
});
