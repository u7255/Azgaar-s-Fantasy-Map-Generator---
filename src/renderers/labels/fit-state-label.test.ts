import { describe, expect, it } from "vitest";
import { estimateTextWidth } from "./fit-state-label";

describe("estimateTextWidth", () => {
  it("counts CJK ideographs as full-width characters", () => {
    expect(estimateTextWidth("神圣阿尔多里亚联合王国")).toBe(11);
    expect(estimateTextWidth("中文")).toBe(2);
  });

  it("counts CJK punctuation and fullwidth forms as full-width characters", () => {
    expect(estimateTextWidth("。")).toBe(1);
    expect(estimateTextWidth("Ａ")).toBe(1);
  });

  it("keeps Latin text narrower than an equal number of CJK characters", () => {
    expect(estimateTextWidth("West")).toBeLessThan(estimateTextWidth("神圣阿尔多里亚"));
  });
});
