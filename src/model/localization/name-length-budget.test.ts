import { describe, expect, it } from "vitest";
import { assessChineseNameLength, countChineseNameCharacters, getChineseNameLengthBudget } from "./name-length-budget";

describe("T12-C Chinese name length budgets", () => {
  it.each([
    ["state", 3, 6, 8],
    ["province", 3, 6, 8],
    ["burg", 2, 4, 6],
    ["river", 2, 4, 6],
    ["route", 2, 5, 7],
    ["feature", 2, 5, 7],
    ["marker", 2, 5, 7],
    ["zone", 2, 4, 6],
    ["journey", 3, 6, 8],
    ["market", 2, 5, 7],
    ["culture", 2, 5, 7],
    ["religion", 2, 5, 7],
    ["biome", 2, 3, 4],
    ["good", 1, 3, 4],
    ["regiment", 3, 6, 8]
  ] as const)("%s uses the agreed soft and hard limits", (type, softMin, softMax, hardMax) => {
    expect(getChineseNameLengthBudget(type)).toEqual({ softMin, softMax, hardMax });
  });

  it("counts Han characters only and ignores punctuation and separators", () => {
    expect(countChineseNameCharacters("鸦·港 新-城")).toBe(4);
    expect(assessChineseNameLength("鸦·港新", "burg")).toMatchObject({
      charCount: 3,
      softMax: 4,
      hardMax: 6,
      overSoft: false,
      overHard: false
    });
  });

  it("reports soft and hard overruns separately", () => {
    expect(assessChineseNameLength("鸦港新城关", "burg")).toMatchObject({ overSoft: true, overHard: false });
    expect(assessChineseNameLength("鸦港新城西关外", "burg")).toMatchObject({ overSoft: true, overHard: true });
  });
});
