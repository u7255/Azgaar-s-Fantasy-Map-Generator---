import { describe, expect, it } from "vitest";
import {
  CHINESE_NAME_STYLE_IDS,
  CHINESE_NAME_STYLES,
  DEFAULT_CHINESE_NAME_STYLE_ID,
  isChineseNameStyleId,
  resolveChineseNameStyle
} from "./chinese-name-styles";

describe("T12-C naming style registry", () => {
  it("registers the complete stable style matrix", () => {
    expect(CHINESE_NAME_STYLES.map(style => style.id)).toEqual([...CHINESE_NAME_STYLE_IDS]);
    expect(new Set(CHINESE_NAME_STYLES.map(style => style.id)).size).toBe(CHINESE_NAME_STYLE_IDS.length);
    expect(new Set(CHINESE_NAME_STYLES.map(style => style.label)).size).toBe(CHINESE_NAME_STYLE_IDS.length);
  });

  it("uses restrained common-character western medieval names by default", () => {
    const style = resolveChineseNameStyle(undefined);
    expect(style.id).toBe(DEFAULT_CHINESE_NAME_STYLE_ID);
    expect(style).toMatchObject({
      tradition: "western",
      register: "medieval",
      commonCharactersOnly: true,
      hybrid: false
    });
  });

  it("keeps mixed style optional and resolves unknown values to the default", () => {
    expect(CHINESE_NAME_STYLES.filter(style => style.hybrid).map(style => style.id)).toEqual(["mixed-chinese-slavic"]);
    expect(resolveChineseNameStyle("future-style").id).toBe(DEFAULT_CHINESE_NAME_STYLE_ID);
    expect(isChineseNameStyleId("mixed-chinese-slavic")).toBe(true);
    expect(isChineseNameStyleId("future-style")).toBe(false);
  });
});
