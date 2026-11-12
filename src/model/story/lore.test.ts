import { beforeEach, describe, expect, it } from "vitest";
import {
  createLocalizedName,
  type LocalizedNames
} from "@/model/localization/localized-names";
import { Options } from "@/model/options/options-model";
import { mapSchema } from "@/model/options/options-schema";
import { Lore } from "./lore";

function localizedLore(): LocalizedNames {
  return {
    zh: createLocalizedName({ text: "瓦尔卡亚", sourceName: "Valcaia" }),
    zhOverride: createLocalizedName({ text: "瓦尔卡亚世界", sourceName: "Valcaia", source: "user" }),
    zhPreview: createLocalizedName({
      text: "瓦尔卡亚预览",
      sourceName: "Valcaia",
      source: "transliteration",
      status: "preview"
    })
  };
}

beforeEach(() => {
  options = Options.getDefaultOptions();
  options.map.lore.name = "Valcaia";
  options.map.lore.description = "The author's free text.";
  options.map.localization.displayMode = "zh";
});

describe("map and Lore names", () => {
  it("uses the Chinese name layer and restores the source title in source mode", () => {
    options.map.lore.localizedNames = localizedLore();
    expect(Lore.getName()).toBe("瓦尔卡亚世界");

    options.map.localization.displayMode = "bilingual";
    expect(Lore.getName()).toBe("瓦尔卡亚世界 · Valcaia");

    options.map.localization.displayMode = "source";
    expect(Lore.getName()).toBe("Valcaia");
    expect(options.map.lore.name).toBe("Valcaia");
    expect(options.map.lore.description).toBe("The author's free text.");
  });

  it("marks every localized title slot stale after the original map name changes", () => {
    options.map.lore.localizedNames = localizedLore();
    Lore.rename("Novaia");

    expect(options.map.lore.name).toBe("Novaia");
    expect(options.map.lore.localizedNames?.zh?.status).toBe("stale");
    expect(options.map.lore.localizedNames?.zhOverride?.status).toBe("stale");
    expect(options.map.lore.localizedNames?.zhPreview?.status).toBe("stale");
    expect(Lore.getName()).toBe("Novaia");
    expect(options.map.lore.description).toBe("The author's free text.");
  });

  it("round-trips the title extension through JSON and the strict map schema", () => {
    options.map.lore.localizedNames = localizedLore();
    const restored = mapSchema.parse(JSON.parse(JSON.stringify(options.map)));

    expect(restored.lore.name).toBe("Valcaia");
    expect(restored.lore.localizedNames?.zh?.text).toBe("瓦尔卡亚");
    expect(restored.lore.localizedNames?.zhOverride?.text).toBe("瓦尔卡亚世界");
    expect(restored.lore.description).toBe("The author's free text.");
  });

  it("ignores a damaged title extension without breaking loading or display", () => {
    (options.map.lore as unknown as { localizedNames: unknown }).localizedNames = "broken";
    expect(() => mapSchema.parse(JSON.parse(JSON.stringify(options.map)))).not.toThrow();
    expect(Lore.getName()).toBe("Valcaia");
  });

  it("accepts an older title record without a status as confirmed", () => {
    options.map.lore.localizedNames = {
      zh: {
        text: "瓦尔卡亚",
        sourceName: "Valcaia",
        source: "manual"
      } as unknown as ReturnType<typeof createLocalizedName>
    };
    expect(Lore.getName()).toBe("瓦尔卡亚");
  });
});
