import { afterEach, describe, expect, it } from "vitest";
import type { OptionsData } from "@/model/options/options-schema";
import { getActiveMapFont } from "@/services/fonts";
import { CHINESE_FONT_UNICODE_RANGE, CHINESE_MAP_FONTS, getChineseMapFont, resolveMapFontFamily } from "./map-fonts";

const previousOptions = globalThis.options;

afterEach(() => {
  globalThis.options = previousOptions;
});

describe("Chinese map fonts", () => {
  it("keeps stable ids and one local WOFF2 asset for each style", () => {
    expect(CHINESE_MAP_FONTS.map(font => font.id)).toEqual(["song-ke", "title-song", "wen-kai", "xing-shu"]);
    for (const font of CHINESE_MAP_FONTS) {
      expect(font.family).not.toBe("");
      expect(font.src).toMatch(/\.woff2(?:$|\?)/);
      expect(font.licenseFile).toMatch(/OFL\.txt$/);
    }
  });

  it("limits the Chinese face to CJK so Latin and digits use the original family", () => {
    expect(CHINESE_FONT_UNICODE_RANGE).toContain("U+4E00-9FFF");
    expect(CHINESE_FONT_UNICODE_RANGE).not.toContain("U+0000-00FF");

    expect(resolveMapFontFamily("Almendra SC", "zh", "wen-kai")).toBe(
      '"LXGW WenKai", Almendra SC, "LXGW WenKai Lite", "Kaiti SC", STKaiti, KaiTi, serif'
    );
  });

  it("returns the original family untouched in source mode", () => {
    expect(resolveMapFontFamily('"Times New Roman", serif', "source", "xing-shu")).toBe('"Times New Roman", serif');
  });

  it("keeps the Chinese face for bilingual labels", () => {
    expect(resolveMapFontFamily("Almendra SC", "bilingual", "wen-kai")).toContain('"LXGW WenKai"');
  });

  it("repairs an unknown stored style to the default", () => {
    expect(getChineseMapFont("unknown").id).toBe("song-ke");
  });

  it("embeds the selected local face only while Chinese mode is active", () => {
    globalThis.options = {
      map: { localization: { displayMode: "zh", mapFont: "xing-shu" } }
    } as OptionsData;
    expect(getActiveMapFont()).toMatchObject({
      family: "Ma Shan Zheng",
      unicodeRange: CHINESE_FONT_UNICODE_RANGE
    });

    globalThis.options = {
      map: { localization: { displayMode: "source", mapFont: "xing-shu" } }
    } as OptionsData;
    expect(getActiveMapFont()).toBeUndefined();

    globalThis.options = {
      map: { localization: { displayMode: "bilingual", mapFont: "xing-shu" } }
    } as OptionsData;
    expect(getActiveMapFont()).toMatchObject({ family: "Ma Shan Zheng" });
  });
});
