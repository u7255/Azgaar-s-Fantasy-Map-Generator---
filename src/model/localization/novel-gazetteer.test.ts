import { csvParseRows } from "d3";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalizedName } from "@/model/localization/localized-names";
import {
  buildNovelGazetteer,
  type NovelGazetteerDocument,
  summarizeGazetteerNote
} from "@/model/localization/novel-gazetteer";
import {
  formatNovelGazetteerCsv,
  formatNovelGazetteerJson,
  formatNovelGazetteerMarkdown
} from "@/services/io/novel-gazetteer";

const localized = (
  text: string,
  sourceName: string,
  options: { pinyin?: string; aliases?: string[]; status?: "confirmed" | "preview" } = {}
) => ({
  zh:
    options.status === "preview"
      ? undefined
      : createLocalizedName({
          text,
          sourceName,
          pinyin: options.pinyin,
          aliases: options.aliases,
          status: "confirmed"
        }),
  zhPreview:
    options.status === "preview"
      ? createLocalizedName({
          text,
          sourceName,
          pinyin: options.pinyin,
          aliases: options.aliases,
          source: "transliteration",
          status: "preview"
        })
      : undefined
});

function fixture() {
  const state = {
    i: 1,
    name: "Ardenia",
    fullName: "Kingdom of Ardenia",
    form: "Monarchy",
    culture: 1,
    capital: 1,
    provinces: [1],
    neighbors: [2],
    rural: 100,
    urban: 20,
    note: "<p>The old kingdom.   Its roads cross the <b>mountains</b>.</p>",
    localizedNames: localized("阿登尼亚", "Ardenia")
  };
  const neighbor = {
    i: 2,
    name: "Craghold",
    fullName: "Kingdom of Craghold",
    culture: 1,
    capital: 2,
    provinces: [],
    neighbors: [1],
    rural: 10,
    urban: 2,
    localizedNames: localized("克拉格霍尔德", "Craghold")
  };
  const province = {
    i: 1,
    state: 1,
    burg: 1,
    center: 1,
    name: "Ravenshire",
    fullName: "County of Ravenshire",
    rural: 50,
    urban: 5,
    localizedNames: localized("渡鸦郡", "Ravenshire")
  };
  const burg = {
    i: 1,
    cell: 1,
    x: 10,
    y: 10,
    state: 1,
    culture: 1,
    port: 1,
    population: 2.5,
    name: "Ravenhold",
    label: { text: "Ravenhold" },
    note: "A walled town, built around an old raven tower.",
    localizedNames: localized("鸦堡", "Ravenhold", { pinyin: "Yābǎo", aliases: ["Raven Keep"] })
  };
  const marker = {
    i: 1,
    cell: 2,
    x: 20,
    y: 20,
    name: "Mount Doom",
    type: "volcano",
    localizedNames: localized("末日山", "Mount Doom", { status: "preview" })
  };
  const river = {
    i: 1,
    name: "Alder",
    type: "River",
    cells: [1, 2],
    parent: 0,
    basin: 1,
    note: "A fast river."
  };
  const route = {
    i: 0,
    name: "King's Road",
    points: [
      [0, 0, 1],
      [10, 10, 2]
    ]
  };
  const port = {
    i: 1,
    name: "Mirror Lake",
    type: "lake",
    subtype: "freshwater",
    firstCell: 2,
    vertices: [0],
    cells: 1,
    localizedNames: localized("镜湖", "Mirror Lake")
  };
  const zone = {
    i: 1,
    name: "Plague",
    type: "Disease",
    cells: [1],
    note: "A quarantine surrounds the eastern quarter."
  };
  const journey = { i: 0, name: "Pilgrimage", type: "Quest", segments: [] };
  const market = {
    i: 1,
    centerBurgId: 1,
    name: "",
    localizedNames: localized("大集市", "Ravenhold")
  };
  const regiment = {
    i: 0,
    name: "1st Cavalry",
    state: 1,
    cell: 1,
    x: 10,
    y: 10,
    bx: 10,
    by: 10,
    a: 1,
    t: 1,
    s: 0,
    u: {},
    n: 0,
    type: "cavalry",
    icon: ""
  };
  (state as typeof state & { military: unknown[] }).military = [regiment];
  const label = { i: 1, x: 5, y: 5, label: { text: "Old Name" } };
  const culture = {
    i: 1,
    name: "Aeloran",
    type: "Generic",
    origins: [1],
    rural: 20,
    urban: 2,
    localizedNames: localized("精灵文化", "Aeloran")
  };
  const religion = { i: 1, name: "Sun Cult", type: "Cult", culture: 1, origins: [1], rural: 20, urban: 2 };
  const biome = { i: 1, name: "Taiga", color: "#456" };
  const good = { i: 1, name: "Salt", tags: [], color: "#fff", icon: "", value: 1, unit: "", carriage: 1 };
  const lore = { name: "Valcaia", localizedNames: localized("瓦尔卡亚", "Valcaia") };

  globalThis.options = {
    map: {
      lore,
      goods: [good],
      units: {
        population: { scale: 1, urbanization: { rate: 1, density: 10 } }
      },
      localization: { displayMode: "zh" },
      seed: "fixture-seed"
    }
  } as unknown as typeof options;
  globalThis.pack = {
    states: [{ i: 0, name: "Neutrals" }, state, neighbor],
    provinces: [{ i: 0 }, province],
    burgs: [0, burg],
    markers: [marker],
    rivers: [0, river],
    routes: [route],
    features: [0, port],
    zones: [zone],
    journeys: [journey],
    markets: [market],
    addedLabels: [label],
    cultures: [{ i: 0 }, culture],
    religions: [{ i: 0 }, religion],
    biomes: [{ i: 0 }, biome],
    cells: {
      i: [0, 1, 2],
      p: [
        [0, 0],
        [10, 10],
        [20, 20]
      ],
      pop: [0, 10, 20],
      state: [0, 1, 2],
      province: [0, 1, 0],
      culture: [0, 1, 1],
      religion: [0, 1, 1],
      burg: [0, 1, 0]
    }
  } as unknown as typeof pack;

  return {
    state,
    neighbor,
    province,
    burg,
    marker,
    river,
    route,
    port,
    zone,
    journey,
    market,
    regiment,
    label,
    culture,
    religion,
    biome,
    good,
    lore
  };
}

beforeEach(() => {
  fixture();
});

describe("novel gazetteer data", () => {
  it("exports every named entity type in a stable type and id order", () => {
    const first = buildNovelGazetteer();
    const second = buildNovelGazetteer();

    expect(first).toEqual(second);
    expect(first.title).toBe("瓦尔卡亚");
    expect(first.entries.map(entry => entry.typeKey)).toEqual([
      "state",
      "state",
      "province",
      "burg",
      "marker",
      "river",
      "route",
      "feature",
      "zone",
      "journey",
      "market",
      "regiment",
      "addedLabel",
      "culture",
      "religion",
      "biome",
      "good"
    ]);
    expect(first.entries.filter(entry => entry.typeKey === "state").map(entry => entry.originalName)).toEqual([
      "Kingdom of Ardenia",
      "Kingdom of Craghold"
    ]);
  });

  it("fills names, metadata, geography, population, note summaries and relations without changing sources", () => {
    const entities = fixture();
    const document = buildNovelGazetteer();
    const burg = document.entries.find(entry => entry.typeKey === "burg")!;

    expect(burg).toMatchObject({
      chineseName: "鸦堡",
      originalName: "Ravenhold",
      displayName: "鸦堡",
      pinyin: "Yābǎo",
      aliases: ["Raven Keep"],
      country: "阿登尼亚",
      province: "渡鸦郡",
      population: 3,
      noteSummary: "A walled town, built around an old raven tower."
    });
    expect(burg.relatedEntities).toEqual(["精灵文化", "阿登尼亚", "镜湖", "渡鸦郡"]);
    expect(document.entries.find(entry => entry.typeKey === "state")?.noteSummary).toBe(
      "The old kingdom. Its roads cross the mountains."
    );
    expect(document.entries.find(entry => entry.typeKey === "market")).toMatchObject({
      originalName: "Ravenhold",
      chineseName: "大集市",
      displayName: "大集市",
      country: "阿登尼亚",
      province: "渡鸦郡",
      population: 3,
      relatedEntities: ["鸦堡"]
    });

    expect(entities.state.name).toBe("Ardenia");
    expect(entities.state.fullName).toBe("Kingdom of Ardenia");
    expect(entities.burg.name).toBe("Ravenhold");
    expect(entities.burg.label.text).toBe("Ravenhold");
    expect(entities.burg.localizedNames.zh?.text).toBe("鸦堡");
  });

  it("excludes unconfirmed previews by default and includes them only when requested", () => {
    const excluded = buildNovelGazetteer();
    const included = buildNovelGazetteer({ includePreview: true });
    const marker = (document: NovelGazetteerDocument) => document.entries.find(entry => entry.typeKey === "marker")!;

    expect(marker(excluded)).toMatchObject({
      chineseName: "",
      displayName: "Mount Doom",
      noteSummary: ""
    });
    expect(marker(included)).toMatchObject({
      chineseName: "末日山",
      displayName: "末日山"
    });
  });

  it("derives missing pinyin from Chinese names without replacing stored pinyin", () => {
    const document = buildNovelGazetteer();
    const state = document.entries.find(entry => entry.typeKey === "state")!;
    const burg = document.entries.find(entry => entry.typeKey === "burg")!;

    expect(state.chineseName).toBe("阿登尼亚");
    expect(state.pinyin).toBe("ā dēng ní yà");
    expect(burg.chineseName).toBe("鸦堡");
    expect(burg.pinyin).toBe("Yābǎo");
  });

  it("leaves pinyin empty for missing or non-Chinese display names", () => {
    const empty = buildNovelGazetteer().entries.find(entry => entry.typeKey === "marker")!;
    expect(empty.chineseName).toBe("");
    expect(empty.pinyin).toBe("");

    const marker = pack.markers[0] as unknown as { localizedNames: unknown };
    marker.localizedNames = {
      zh: createLocalizedName({ text: "Mount Doom", sourceName: "Mount Doom" })
    };
    const english = buildNovelGazetteer().entries.find(entry => entry.typeKey === "marker")!;
    expect(english.chineseName).toBe("Mount Doom");
    expect(english.pinyin).toBe("");
  });

  it("uses the selected name mode for the document and relationships", () => {
    const chinese = buildNovelGazetteer({ mode: "zh" });
    const bilingual = buildNovelGazetteer({ mode: "bilingual" });
    const source = buildNovelGazetteer({ mode: "source" });

    expect(chinese.entries.find(entry => entry.typeKey === "burg")?.displayName).toBe("鸦堡");
    expect(bilingual.entries.find(entry => entry.typeKey === "burg")?.displayName).toBe("鸦堡 · Ravenhold");
    expect(source.entries.find(entry => entry.typeKey === "burg")?.displayName).toBe("Ravenhold");
    expect(source.entries.find(entry => entry.typeKey === "burg")?.country).toBe("Kingdom of Ardenia");
    expect(source.entries.find(entry => entry.typeKey === "burg")?.type).toBe("burg");
  });

  it("does not change names, ids, seed, labels or entity order", () => {
    const entities = fixture();
    const before = {
      state: { name: entities.state.name, fullName: entities.state.fullName, id: entities.state.i },
      province: { name: entities.province.name, fullName: entities.province.fullName, id: entities.province.i },
      burg: { name: entities.burg.name, label: entities.burg.label.text, id: entities.burg.i },
      stateIds: pack.states.map(entity => entity.i),
      burgIds: pack.burgs.map(entity => entity.i),
      seed: options.map.seed
    };

    buildNovelGazetteer({ mode: "bilingual", includePreview: true });

    expect({
      state: { name: entities.state.name, fullName: entities.state.fullName, id: entities.state.i },
      province: { name: entities.province.name, fullName: entities.province.fullName, id: entities.province.i },
      burg: { name: entities.burg.name, label: entities.burg.label.text, id: entities.burg.i },
      stateIds: pack.states.map(entity => entity.i),
      burgIds: pack.burgs.map(entity => entity.i),
      seed: options.map.seed
    }).toEqual(before);
  });

  it("shortens notes by code point without touching the source note", () => {
    const source = "龙".repeat(20);
    const summary = summarizeGazetteerNote(source, 10);

    expect(Array.from(summary).length).toBe(10);
    expect(summary.endsWith("...")).toBe(true);
    expect(source).toBe("龙".repeat(20));
  });
});

describe("novel gazetteer formats", () => {
  it("writes Excel-friendly CSV with the required columns, BOM and escaped unicode values", () => {
    const document = buildNovelGazetteer({ includePreview: true });
    const marker = document.entries.find(entry => entry.typeKey === "marker")!;
    marker.originalName = 'Mount "Ash", 龙\nPeak';
    marker.aliases = ["火山; 圣山"];

    const csv = formatNovelGazetteerCsv(document);
    const rows = csvParseRows(csv.slice(1));
    const burgRow = rows.find(row => row[2] === "Ravenhold")!;
    const markerRow = rows.find(row => row[2] === 'Mount "Ash", 龙\nPeak')!;

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(rows[0]).toHaveLength(10);
    expect(burgRow).toContain("鸦堡");
    expect(markerRow).toContain('Mount "Ash", 龙\nPeak');
    expect(markerRow).toContain("火山; 圣山");
  });

  it("writes JSON that standard tools can parse", () => {
    const document = buildNovelGazetteer({ mode: "bilingual", includePreview: true });
    const parsed = JSON.parse(formatNovelGazetteerJson(document)) as NovelGazetteerDocument;

    expect(parsed.mode).toBe("bilingual");
    expect(parsed.includePreview).toBe(true);
    expect(parsed.entries.find(entry => entry.typeKey === "marker")).toMatchObject({
      chineseName: "末日山",
      displayName: "末日山 · Mount Doom"
    });
  });

  it("writes readable Markdown with every field and safe special characters", () => {
    const document = buildNovelGazetteer();
    const burg = document.entries.find(entry => entry.typeKey === "burg")!;
    burg.noteSummary = "Line one | line two <tag>";

    const markdown = formatNovelGazetteerMarkdown(document);

    expect(markdown).toContain("# 瓦尔卡亚 - Novel Gazetteer");
    expect(markdown).toContain("## Burg");
    expect(markdown).toContain("### 鸦堡");
    expect(markdown).toContain("- Chinese name: 鸦堡");
    expect(markdown).toContain("- Original: Ravenhold");
    expect(markdown).toContain("- Pinyin: Yābǎo");
    expect(markdown).toContain("- Country: 阿登尼亚");
    expect(markdown).toContain("- Province: 渡鸦郡");
    expect(markdown).toContain("- Population: 3");
    expect(markdown).toContain("- Note summary: Line one \\| line two \\<tag\\>");
    expect(markdown).toContain("- Related entities:");
  });
});
