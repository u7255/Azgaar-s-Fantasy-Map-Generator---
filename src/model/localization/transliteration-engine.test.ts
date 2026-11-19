import { describe, expect, it, vi } from "vitest";
import { getLocalizedNameSourceHash, resolveLocalizedName } from "./localized-names";
import { assessChineseNameLength } from "./name-length-budget";
import {
  type ChineseNameSource,
  findLocalizedNameCollisions,
  suggestChineseName,
  suggestChineseNames,
  suggestChineseNameWithTrace
} from "./transliteration-engine";

describe("six rule layers", () => {
  it("uses the complete dictionary before type and phonetic rules", () => {
    expect(suggestChineseNameWithTrace("Ravenhold").layers).toEqual(["complete-dictionary"]);
    expect(suggestChineseName("Ravenhold").text).toBe("鸦堡");
  });

  it("uses type phrases before roots", () => {
    const suggestion = suggestChineseNameWithTrace("Sea of Storms");
    expect(suggestion.layers).toEqual(["type-phrase", "roots"]);
    expect(suggestion.localizedName.text).toBe("风暴海");
  });

  it("uses compound roots before phonetic syllable rules", () => {
    const suggestion = suggestChineseNameWithTrace("Blackwater");
    expect(suggestion.layers).toEqual(["roots"]);
    expect(suggestion.localizedName.text).toBe("黑水");
  });

  it("falls through consonant clusters, vowel groups and character fallback", () => {
    const phonetic = suggestChineseNameWithTrace("Zryx");
    expect(phonetic.layers).toContain("consonant-clusters");
    expect(phonetic.layers).toContain("vowel-combinations");
    expect(phonetic.localizedName.text).toMatch(/^[\p{Script=Han}]+$/u);

    const fallback = suggestChineseNameWithTrace("X");
    expect(fallback.layers).toEqual(["character-fallback"]);
    expect(fallback.localizedName.text).toBe("克斯");
  });

  it("keeps type parsing ahead of a proper-name dictionary hit", () => {
    expect(suggestChineseNameWithTrace("Kingdom of Aldoria").layers).toEqual(["type-phrase", "complete-dictionary"]);
  });
});

describe("required name classes", () => {
  it.each([
    ["Kingdom of Aldoria", "阿尔多里亚王国"],
    ["Sea of Storms", "风暴海"],
    ["Vel River", "维尔河"],
    ["Aymar Theocracy", "艾马尔神权国"],
    ["Republic of Ardenia", "阿登尼亚共和国"],
    ["Grand Duchy of Aldoria", "阿尔多里亚大公国"],
    ["County of Ravenshire", "渡鸦郡"],
    ["Mount Doom", "末日山"],
    ["Mirror Lake", "镜湖"],
    ["Bay of Whispers", "低语湾"],
    ["Isle of Mists", "雾岛"],
    ["The Azure Ocean", "蔚蓝洋"],
    ["Gulf of Tears", "泪湾"],
    ["River of Kings", "国王河"],
    ["Forest of Shadows", "影森林"],
    ["Blackwater", "黑水"],
    ["Silverwood", "银林"],
    ["Frostvale", "霜谷"],
    ["Stormwatch", "风暴望"],
    ["King's Road", "国王大道"],
    ["Cape of Good Hope", "好望角"]
  ])("turns %s into %s", (source, expected) => {
    expect(suggestChineseName(source).text).toBe(expected);
  });

  it("uses a separately stored feature type without inventing a full name", () => {
    const suggestion = suggestChineseName({ name: "Vel", type: "River" });
    expect(suggestion).toMatchObject({
      text: "维尔河",
      sourceName: "Vel",
      sourceFullName: undefined
    });
  });

  it("passes an already-Chinese name through without rewriting it", () => {
    expect(suggestChineseName("阿尔多里亚").text).toBe("阿尔多里亚");
  });

  it.each([
    ["Kingdom", "王国"],
    ["Ocean", "洋"],
    ["Mount", "山"],
    ["Island", "岛"],
    ["River", "河"],
    ["City-State", "城邦"]
  ])("handles the standalone type word %s", (source, expected) => {
    expect(suggestChineseName(source).text).toBe(expected);
  });
});

describe("preview-only T04 output", () => {
  it("returns a transliteration preview with the source identity attached", () => {
    const suggestion = suggestChineseName({
      name: "Aymar",
      fullName: "Aymar Theocracy"
    });

    expect(suggestion).toEqual({
      text: "艾马尔神权国",
      pinyin: undefined,
      aliases: undefined,
      source: "transliteration",
      status: "preview",
      sourceName: "Aymar",
      sourceFullName: "Aymar Theocracy",
      sourceHash: getLocalizedNameSourceHash("Aymar"),
      styleId: "western-medieval"
    });
    expect(
      resolveLocalizedName({
        localizedNames: { zhPreview: suggestion },
        name: "Aymar",
        fullName: "Aymar Theocracy"
      })
    ).toMatchObject({ text: "艾马尔神权国", tier: "preview" });
  });

  it("never mutates the source object, entity extension or map seed", () => {
    const source = Object.freeze({ name: "Aymar", fullName: "Kingdom of Aymar" });
    const seed = options.map.seed;

    suggestChineseName(source);

    expect(source).toEqual({ name: "Aymar", fullName: "Kingdom of Aymar" });
    expect(source).not.toHaveProperty("localizedNames");
    expect(options.map.seed).toBe(seed);
  });
});

describe("manual review overrides", () => {
  it("lets an override for the full display name win", () => {
    const suggestion = suggestChineseName(
      { name: "Aymar", fullName: "Kingdom of Aymar" },
      { overrides: { " kingdom   OF aymar ": "艾玛王庭" } }
    );
    expect(suggestion).toMatchObject({
      text: "艾玛王庭",
      source: "transliteration",
      status: "preview",
      sourceName: "Aymar",
      sourceFullName: "Kingdom of Aymar"
    });
  });

  it("applies a short-name override inside a generated type phrase", () => {
    expect(
      suggestChineseName({ name: "Aymar", fullName: "Kingdom of Aymar" }, { overrides: new Map([["Aymar", "艾玛尔"]]) })
        .text
    ).toBe("艾玛尔王国");
  });

  it("keeps manual override text as preview and does not confirm it", () => {
    expect(suggestChineseName("Aldoria", { overrides: { aldoria: "亚尔多" } }).status).toBe("preview");
  });
});

describe("T12-C styles and short-name budgets", () => {
  it.each([
    ["state", { name: "Soroughia", fullName: "Grand Duchy of Soroughia" }, 6],
    ["province", { name: "Orporland", fullName: "Orporland County" }, 6],
    ["burg", { name: "Gabingra" }, 4],
    ["river", { name: "Lietersbach", type: "River" }, 4],
    ["route", { name: "Ember route" }, 5]
  ] as const)("keeps an ordinary long %s name within its soft target", (entityType, source, softMax) => {
    const suggestion = suggestChineseNameWithTrace(source, { entityType });
    expect(suggestion.length?.charCount).toBeLessThanOrEqual(softMax);
    expect(suggestion.localizedName.text).toMatch(/^[\p{Script=Han}]+$/u);
    expect(suggestion.localizedName.styleId).toBe("western-medieval");
  });

  it("changes suggestions with style without using rare characters or truncating a word", () => {
    const medieval = suggestChineseName("Coalbrook", { entityType: "burg", style: "western-medieval" });
    const industrial = suggestChineseName("Coalbrook", { entityType: "burg", style: "western-industrial" });

    expect(industrial.text).not.toBe(medieval.text);
    expect(industrial.styleId).toBe("western-industrial");
    expect(industrial.text).toMatch(/^[\p{Script=Han}]+$/u);
  });

  it("supports the optional hybrid style without adding a separator by default", () => {
    const suggestion = suggestChineseNameWithTrace("Ravenvale", {
      entityType: "burg",
      style: "mixed-chinese-slavic"
    });
    expect(suggestion.localizedName.styleId).toBe("mixed-chinese-slavic");
    expect(suggestion.localizedName.text).not.toContain("·");
    expect(suggestion.length?.charCount).toBeLessThanOrEqual(6);
  });

  it("does not repeat a type suffix already present in the proper name", () => {
    expect(
      suggestChineseName(
        { name: "Ravenshire", fullName: "County of Ravenshire" },
        { entityType: "province", style: "western-medieval" }
      ).text
    ).not.toMatch(/郡郡$/u);
  });

  it("keeps non-name metadata such as culture type out of the Chinese suggestion", () => {
    const suggestion = suggestChineseName({ name: "Aeloran", type: "Generic" }, { entityType: "culture" });
    expect(suggestion.text).toMatch(/^[\p{Script=Han}]+$/u);
    expect(suggestion.text).not.toContain("Generic");
    expect(suggestion.text).not.toContain("格内里克");
  });

  it("keeps a broader long-name matrix out of the hard limit and mostly within soft targets", () => {
    const cases = [
      ["burg", "Kastellanburg"],
      ["burg", "Morgensternhafen"],
      ["burg", "Drachenfelderstadt"],
      ["burg", "Silberwolfsheim"],
      ["burg", "Rabensteinburg"],
      ["river", "Morgensternbach River"],
      ["river", "Silberwolfsbach River"],
      ["river", "Drachenfelderstrom River"],
      ["river", "Kastellenwasser River"],
      ["river", "Rabensteinbach River"],
      ["route", "Morgenstern Highway"],
      ["route", "Silberwolfsweg route"],
      ["route", "Drachenfelder Pass Road"],
      ["route", "Kastellenbrücke route"],
      ["route", "Rabensteinweg Road"]
    ] as const;

    const results = cases.map(([entityType, name]) => {
      const text = suggestChineseName(name, { entityType, style: "western-medieval" }).text;
      return {
        entityType,
        text,
        assessment: assessChineseNameLength(text, entityType)
      };
    });
    expect(results.every(result => /^[\p{Script=Han}]+$/u.test(result.text))).toBe(true);
    expect(results.every(result => !result.assessment.overHard)).toBe(true);
    expect(results.filter(result => !result.assessment.overSoft).length / results.length).toBeGreaterThanOrEqual(0.8);
  });
});

describe("determinism and offline behavior", () => {
  it("normalizes case, punctuation and whitespace to one stable source key", () => {
    const first = suggestChineseName("  kingdom   OF   aldoria ");
    const second = suggestChineseName("Kingdom of Aldoria");
    expect(first.text).toBe(second.text);
    expect(first.sourceHash).not.toBe(second.sourceHash);
  });

  it("returns the same value every time", () => {
    const first = suggestChineseName("Zephyria");
    const second = suggestChineseName("Zephyria");
    expect(second).toEqual(first);
  });

  it("does not use fetch or any network API", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("network access is forbidden");
    });
    vi.stubGlobal("fetch", fetchSpy);
    try {
      expect(suggestChineseName("Vel River").text).toBe("维尔河");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("batch and collision checks", () => {
  it("suggests a batch without mutating inputs", () => {
    const sources: ChineseNameSource[] = [
      { name: "Vel", type: "River" },
      { name: "Aymar", fullName: "Kingdom of Aymar" }
    ];
    const snapshot = JSON.stringify(sources);
    expect(suggestChineseNames(sources).map(name => name.text)).toEqual(["维尔河", "艾马尔王国"]);
    expect(JSON.stringify(sources)).toBe(snapshot);
  });

  it("detects distinct sources that collapse to the same Chinese name", () => {
    const names = [
      suggestChineseName("Aldoria"),
      suggestChineseName("Ardenia", { overrides: { Ardenia: "阿尔多里亚" } }),
      suggestChineseName("Aymar")
    ];
    expect(findLocalizedNameCollisions(names)).toEqual([{ text: "阿尔多里亚", sourceNames: ["Aldoria", "Ardenia"] }]);
  });

  it("does not report duplicate suggestions from the same source as a collision", () => {
    const name = suggestChineseName("Aldoria");
    expect(findLocalizedNameCollisions([name, { ...name }])).toEqual([]);
  });

  it("accepts auditable dictionary extensions without editing defaults", () => {
    expect(
      suggestChineseName("Grimvale", {
        dictionary: {
          words: { grim: "阴森" }
        }
      }).text
    ).toBe("阴森谷");
    expect(suggestChineseName("Grimvale").text).not.toBe("阴森谷");
  });
});

describe("invalid input", () => {
  it.each(["", "   ", { name: "" }, { name: " " }])("rejects an empty source name %o", source => {
    expect(() => suggestChineseName(source)).toThrow("non-empty source name");
  });
});
