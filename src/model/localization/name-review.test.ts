// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalizedName, type LocalizedNames } from "./localized-names";
import {
  filterNameReviewRows,
  getNameReviewStats,
  listNameReviewRows,
  NameReviewStore,
  REVIEW_ENTITY_TYPES
} from "./name-review";

type ReviewRecord = {
  i: number;
  name?: string;
  fullName?: string;
  type?: string;
  label?: { text?: string };
  localizedNames?: LocalizedNames;
  [key: string]: unknown;
};

function localized(text: string, name: string, status: "confirmed" | "preview" | "stale" = "confirmed") {
  return createLocalizedName({
    text,
    sourceName: name,
    source: status === "preview" ? "transliteration" : "manual",
    status
  });
}

function records(): Record<string, ReviewRecord> {
  return {
    state: { i: 1, name: "Ardenia", fullName: "Kingdom of Ardenia" },
    province: { i: 1, name: "Ravenshire", fullName: "County of Ravenshire" },
    burg: { i: 1, name: "Ravenhold" },
    river: { i: 1, name: "Alder", type: "River" },
    route: { i: 0, name: "King's Road", points: [[0, 0, 0]] },
    feature: { i: 1, name: "Mirror Lake", type: "lake" },
    marker: { i: 1, name: "Mount Doom" },
    zone: { i: 1, name: "Plague" },
    journey: { i: 0, name: "Pilgrimage" },
    market: { i: 1, centerBurgId: 1, color: "#fff", goods: {} },
    regiment: { i: 0, name: "1st Cavalry" },
    addedLabel: { i: 1, label: { text: "Old Name" } },
    culture: { i: 1, name: "Aeloran", type: "Generic" },
    religion: { i: 1, name: "Sun Cult", type: "Cult" },
    biome: { i: 1, name: "Taiga", color: "#456" },
    good: { i: 1, name: "Salt" }
  };
}

beforeEach(() => {
  const entity = records();
  globalThis.pack = {
    states: [{ i: 0 }, { ...entity.state, military: [entity.regiment] }],
    provinces: [{ i: 0 }, entity.province],
    burgs: [0, entity.burg],
    rivers: [0, entity.river],
    routes: [entity.route],
    features: [0, entity.feature],
    markers: [entity.marker],
    zones: [0, entity.zone],
    journeys: [entity.journey],
    markets: [entity.market],
    addedLabels: [entity.addedLabel],
    cells: { i: [0], p: [[0, 0]] },
    cultures: [{ i: 0 }, entity.culture],
    religions: [{ i: 0 }, entity.religion],
    biomes: [entity.biome]
  } as unknown as typeof pack;
  options.map.goods = [entity.good] as never;
  options.map.lore = {
    name: "Valcaia",
    description: "",
    calendar: { year: 1, era: "Era", eraShort: "E" }
  };
  options.map.seed = "633769215";
  options.map.localization.displayMode = "zh";
});

describe("T06 review model", () => {
  it("covers every named entity type and reports overview counts", () => {
    const rows = listNameReviewRows();
    expect(rows.map(row => row.type)).toEqual([...REVIEW_ENTITY_TYPES, "lore"]);
    expect(getNameReviewStats(rows)).toEqual({
      total: 17,
      confirmed: 0,
      preview: 0,
      stale: 0,
      conflict: 0,
      missing: 17
    });
  });

  it("generates missing suggestions only into zhPreview", () => {
    const sourceBefore = JSON.stringify({
      state: [pack.states[1].name, pack.states[1].fullName, pack.states[1].label?.text],
      burg: pack.burgs[1].name,
      river: [pack.rivers[1].name, pack.rivers[1].type],
      addedLabel: pack.addedLabels[0].label.text
    });
    const orderBefore = listNameReviewRows().map(row => row.key);
    const store = new NameReviewStore();
    const result = store.generateMissing();

    expect(result.changed).toBe(17);
    const rows = store.rows();
    expect(rows.every(row => row.candidateSlot === "zhPreview")).toBe(true);
    expect(rows.every(row => row.candidateStatus === "preview")).toBe(true);
    expect(rows.every(row => row.hasLocalizedName && row.currentText !== row.originalText)).toBe(true);
    expect(rows.map(row => row.key)).toEqual(orderBefore);
    expect(options.map.seed).toBe("633769215");
    expect(
      JSON.stringify({
        state: [pack.states[1].name, pack.states[1].fullName, pack.states[1].label?.text],
        burg: pack.burgs[1].name,
        river: [pack.rivers[1].name, pack.rivers[1].type],
        addedLabel: pack.addedLabels[0].label.text
      })
    ).toBe(sourceBefore);
    expect(JSON.stringify(pack.states[1])).not.toContain('"zh":');
  });

  it("applies previews only after review and skips conflicts", () => {
    pack.states[1].localizedNames = { zhPreview: localized("共同名", "Ardenia", "preview") };
    pack.burgs[1].localizedNames = { zhPreview: localized("共同名", "Ravenhold", "preview") };
    pack.provinces[1].localizedNames = { zhPreview: localized("渡鸦郡", "Ravenshire", "preview") };

    const store = new NameReviewStore();
    const rows = store.rows();
    expect(rows.filter(row => row.isConflict).map(row => row.key)).toEqual(["state:1", "burg:1"]);
    expect(filterNameReviewRows(rows, "conflict")).toHaveLength(2);

    const result = store.applyPreviews(rows);
    expect(result.changed).toBe(1);
    expect(pack.provinces[1].localizedNames?.zh).toMatchObject({ text: "渡鸦郡", status: "confirmed" });
    expect(pack.provinces[1].localizedNames?.zhPreview).toBeUndefined();
    expect(pack.states[1].localizedNames?.zh).toBeUndefined();
    expect(pack.burgs[1].localizedNames?.zh).toBeUndefined();
  });

  it("keeps a stale row manually processable and filters it without confirming it", () => {
    pack.states[1].localizedNames = {
      zhPreview: localized("旧译名", "Ardenia", "preview"),
      zh: { ...localized("旧名", "Old Ardenia"), status: "stale" }
    };
    const store = new NameReviewStore();
    const row = store.rows().find(candidate => candidate.key === "state:1")!;

    expect(row.isStale).toBe(true);
    expect(filterNameReviewRows(store.rows(), "stale").map(candidate => candidate.key)).toContain("state:1");
    expect(row.candidate?.slot).toBe("zhPreview");
    expect(store.regenerate(row)).toBe(true);
    expect(pack.states[1].localizedNames?.zhPreview?.status).toBe("preview");
    expect(pack.states[1].localizedNames?.zh?.status).toBe("stale");
  });

  it("edits into zhOverride and clears only Chinese slots, preserving unknown extension fields", () => {
    const state = pack.states[1];
    state.localizedNames = {
      future: { keep: true },
      zh: localized("阿登尼亚", "Ardenia"),
      zhPreview: localized("阿登", "Ardenia", "preview")
    } as LocalizedNames;
    const store = new NameReviewStore();
    let row = store.rows().find(candidate => candidate.key === "state:1")!;

    expect(store.edit(row, "阿登王国")).toBe(true);
    row = store.rows().find(candidate => candidate.key === "state:1")!;
    expect(row.candidate).toMatchObject({ slot: "zhOverride", status: "confirmed" });
    expect(state.localizedNames?.zhOverride).toMatchObject({ text: "阿登王国", source: "user" });
    expect((state.localizedNames as unknown as Record<string, unknown>).future).toEqual({ keep: true });

    expect(store.clear(row)).toBe(true);
    expect(state.localizedNames).toEqual({ future: { keep: true } } as unknown as LocalizedNames);
  });

  it("accepts a preview into the confirmed zh slot", () => {
    pack.provinces[1].localizedNames = {
      zhPreview: localized("渡鸦郡", "Ravenshire", "preview")
    };
    const store = new NameReviewStore();
    const row = store.rows().find(candidate => candidate.key === "province:1")!;

    expect(store.accept(row)).toBe(true);
    expect(pack.provinces[1].localizedNames?.zh).toMatchObject({ text: "渡鸦郡", status: "confirmed" });
    expect(pack.provinces[1].localizedNames?.zhPreview).toBeUndefined();
    expect(store.rows().find(candidate => candidate.key === "province:1")?.candidate).toMatchObject({
      slot: "zh",
      status: "confirmed"
    });
  });

  it("reviews the map/Lore title without changing the source title", () => {
    const store = new NameReviewStore();
    const row = store.rows().find(candidate => candidate.key === "lore:0")!;
    expect(row.type).toBe("lore");
    expect(store.edit(row, "瓦尔卡亚")).toBe(true);
    expect(options.map.lore.name).toBe("Valcaia");
    expect(options.map.lore.localizedNames?.zhOverride?.text).toBe("瓦尔卡亚");

    const edited = store.rows().find(candidate => candidate.key === "lore:0")!;
    expect(store.clear(edited)).toBe(true);
    expect(options.map.lore.name).toBe("Valcaia");
    expect(options.map.lore.localizedNames).toBeUndefined();
  });

  it("undoes the most recent batch from a session snapshot and is empty after reload", () => {
    const store = new NameReviewStore();
    store.generateMissing();
    expect(store.undo()).toBe(17);
    expect(store.rows().every(row => !row.hasLocalizedName)).toBe(true);
    expect(store.canUndo()).toBe(false);

    pack.states[1].localizedNames = { future: { keep: true } } as unknown as LocalizedNames;
    store.generateMissing();
    expect(store.canUndo()).toBe(true);
    expect(new NameReviewStore().canUndo()).toBe(false);
    expect(store.undo()).toBe(17);
    expect(pack.states[1].localizedNames).toEqual({ future: { keep: true } } as unknown as LocalizedNames);
  });

  it("ignores malformed localizedNames instead of failing the review", () => {
    (pack.states[1] as unknown as ReviewRecord).localizedNames = "broken" as unknown as LocalizedNames;
    (pack.burgs[1] as unknown as ReviewRecord).localizedNames = [] as unknown as LocalizedNames;
    expect(listNameReviewRows()).toHaveLength(17);
  });
});
