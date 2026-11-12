import { describe, expect, it, vi } from "vitest";
import { getLocalizedNameSourceHash, resolveLocalizedName } from "./localized-names";
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
      sourceHash: getLocalizedNameSourceHash("Aymar")
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
