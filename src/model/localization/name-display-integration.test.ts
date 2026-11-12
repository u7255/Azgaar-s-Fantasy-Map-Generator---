// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { AddedLabels } from "@/model/annotations/added-labels";
import { Goods } from "@/model/economy/goods-generator";
import { Markets } from "@/model/economy/markets-generator";
import { Routes } from "@/model/economy/routes-generator";
import {
  createLocalizedName,
  getLocalizedNameSourceHash,
  type LocalizedNames,
  parseLocalizedNames
} from "@/model/localization/localized-names";
import { MapEntities } from "@/model/map-entities";
import { Biomes } from "@/model/physical/biomes-generator";
import { Features } from "@/model/physical/features-generator";
import { Rivers } from "@/model/physical/river-generator";
import { Burgs } from "@/model/political/burgs-generator";
import { Military } from "@/model/political/military-generator";
import { Provinces } from "@/model/political/provinces-generator";
import { States } from "@/model/political/states-generator";
import { Zones } from "@/model/political/zones-generator";
import { Cultures } from "@/model/society/cultures-generator";
import { Religions } from "@/model/society/religions-generator";
import { Journeys } from "@/model/story/journeys/journeys-generator";
import { Markers } from "@/model/story/markers-generator";

const chinese = (text: string, name: string, fullName?: string) => ({
  zh: createLocalizedName({ text, sourceName: name, sourceFullName: fullName })
});

interface LocalizedNameTestEntity {
  localizedNames?: LocalizedNames;
}

function attachAllSlots(entity: LocalizedNameTestEntity, name: string, fullName?: string): void {
  const localizedName = createLocalizedName({ text: "中文名", sourceName: name, sourceFullName: fullName });
  entity.localizedNames = {
    zh: localizedName,
    zhOverride: { ...localizedName, text: "用户覆盖", source: "user" },
    zhPreview: { ...localizedName, text: "预览名", source: "transliteration", status: "preview" }
  };
}

function slotStatuses(entity: LocalizedNameTestEntity): string[] {
  return [
    entity.localizedNames?.zh?.status ?? "missing",
    entity.localizedNames?.zhOverride?.status ?? "missing",
    entity.localizedNames?.zhPreview?.status ?? "missing"
  ];
}

function entityRecords() {
  return {
    state: {
      i: 1,
      name: "Ardenia",
      fullName: "Kingdom of Ardenia",
      localizedNames: chinese("阿登尼亚", "Ardenia", "Kingdom of Ardenia")
    },
    province: {
      i: 1,
      name: "Ravenshire",
      fullName: "County of Ravenshire",
      localizedNames: chinese("渡鸦郡", "Ravenshire", "County of Ravenshire")
    },
    burg: { i: 1, name: "Ravenhold", localizedNames: chinese("鸦堡", "Ravenhold") },
    river: { i: 1, name: "Alder", type: "River", localizedNames: chinese("赤杨河", "Alder") },
    route: { i: 0, name: "King's Road", localizedNames: chinese("国王大道", "King's Road") },
    feature: { i: 1, name: "Mirror Lake", localizedNames: chinese("镜湖", "Mirror Lake") },
    marker: { i: 1, name: "Mount Doom", localizedNames: chinese("末日山", "Mount Doom") },
    zone: { i: 1, name: "Plague", localizedNames: chinese("疫病", "Plague") },
    journey: { i: 0, name: "Pilgrimage", localizedNames: chinese("朝圣之旅", "Pilgrimage") },
    addedLabel: { i: 1, label: { text: "Old Name" }, localizedNames: chinese("旧名", "Old Name") }
  };
}

function extendedEntityRecords() {
  return {
    culture: { i: 1, name: "Aeloran", type: "Generic", localizedNames: chinese("精灵文化", "Aeloran") },
    religion: { i: 1, name: "Sun Cult", type: "Cult", localizedNames: chinese("太阳教团", "Sun Cult") },
    biome: { i: 1, name: "Taiga", color: "#456", localizedNames: chinese("泰加林", "Taiga") },
    good: { i: 1, name: "Salt", localizedNames: chinese("盐", "Salt") },
    market: { i: 1, centerBurgId: 1, name: "Grand Bazaar", localizedNames: chinese("大集市", "Grand Bazaar") },
    regiment: { i: 0, name: "1st Cavalry", localizedNames: chinese("第一骑兵团", "1st Cavalry") }
  };
}

beforeEach(() => {
  const records = entityRecords();
  globalThis.pack = {
    states: [{ i: 0 }, records.state],
    provinces: [{ i: 0 }, records.province],
    burgs: [0, records.burg],
    rivers: [0, records.river],
    routes: [records.route],
    features: [0, records.feature],
    markers: [records.marker],
    zones: [0, records.zone],
    journeys: [records.journey],
    addedLabels: [records.addedLabel],
    cultures: [{ i: 0 }, extendedEntityRecords().culture],
    religions: [{ i: 0 }, extendedEntityRecords().religion],
    biomes: [{ i: 0 }, extendedEntityRecords().biome],
    markets: [extendedEntityRecords().market],
    cells: { p: [[0, 0]], i: [0] }
  } as unknown as typeof pack;
  pack.states[1].military = [extendedEntityRecords().regiment] as never;
  options.map.goods = [extendedEntityRecords().good] as never;
  options.map.seed = "633769215";
  options.map.localization.displayMode = "zh";
});

describe("all named entity categories", () => {
  it("resolves the ten T08 categories through the Chinese display layer", () => {
    const refs = [
      { type: "culture", id: 1 },
      { type: "religion", id: 1 },
      { type: "biome", id: 1 },
      { type: "good", id: 1 },
      { type: "market", id: 1 },
      { type: "regiment", id: 1, sub: 0 },
      { type: "journey", id: 0 },
      { type: "zone", id: 1 },
      { type: "feature", id: 1 },
      { type: "addedLabel", id: 1 }
    ] as const;

    expect(refs.map(ref => MapEntities.getName(ref))).toEqual([
      "精灵文化",
      "太阳教团",
      "泰加林",
      "盐",
      "大集市",
      "第一骑兵团",
      "朝圣之旅",
      "疫病",
      "镜湖",
      "旧名"
    ]);
  });

  it("keeps every new entity's editable source fields and ids unchanged", () => {
    const records = extendedEntityRecords();
    const before = JSON.stringify(records);
    for (const record of Object.values(records)) JSON.parse(JSON.stringify(record));
    expect(JSON.stringify(records)).toBe(before);
    expect(records.culture.name).toBe("Aeloran");
    expect(records.religion.name).toBe("Sun Cult");
    expect(records.biome.name).toBe("Taiga");
    expect(records.good.name).toBe("Salt");
    expect(records.market.name).toBe("Grand Bazaar");
    expect(records.regiment.name).toBe("1st Cavalry");
    expect(records.market.i).toBe(1);
    expect(records.regiment.i).toBe(0);
  });

  it("falls a nameless market back to its center burg's Chinese display", () => {
    delete pack.markets[0].name;
    delete pack.markets[0].localizedNames;
    expect(MapEntities.getName({ type: "market", id: 1 })).toBe("鸦堡");
    expect(Markets.getName(pack.markets[0])).toBe("鸦堡");
  });

  it("marks a derived market name stale when its center burg is renamed", () => {
    delete pack.markets[0].name;
    pack.markets[0].localizedNames = chinese("大集市", "Ravenhold");
    Burgs.rename(1, "Newhaven");

    expect(pack.burgs[1].name).toBe("Newhaven");
    expect(pack.markets[0].localizedNames?.zh?.status).toBe("stale");
    expect(MapEntities.getName({ type: "market", id: 1 })).toBe("Newhaven");
  });

  it.each([
    ["culture", { type: "culture", id: 1 }, () => pack.cultures[1]],
    ["religion", { type: "religion", id: 1 }, () => pack.religions[1]],
    ["biome", { type: "biome", id: 1 }, () => pack.biomes[1]],
    ["good", { type: "good", id: 1 }, () => options.map.goods[0]],
    ["market", { type: "market", id: 1 }, () => pack.markets[0]],
    ["regiment", { type: "regiment", id: 1, sub: 0 }, () => pack.states[1].military![0]]
  ] as const)("ignores damaged localizedNames on %s", (_type, ref, entityOf) => {
    (entityOf() as unknown as { localizedNames: unknown }).localizedNames = "broken";
    expect(() => MapEntities.getName(ref)).not.toThrow();
  });
});

describe("10 first-batch entities", () => {
  it("all resolve through the same Chinese display layer", () => {
    const refs = [
      { type: "state", id: 1 },
      { type: "province", id: 1 },
      { type: "burg", id: 1 },
      { type: "river", id: 1 },
      { type: "route", id: 0 },
      { type: "feature", id: 1 },
      { type: "marker", id: 1 },
      { type: "zone", id: 1 },
      { type: "journey", id: 0 },
      { type: "addedLabel", id: 1 }
    ] as const;

    expect(refs.map(ref => MapEntities.getName(ref))).toEqual([
      "阿登尼亚",
      "渡鸦郡",
      "鸦堡",
      "赤杨河",
      "国王大道",
      "镜湖",
      "末日山",
      "疫病",
      "朝圣之旅",
      "旧名"
    ]);
  });

  it("defaults to Chinese and restores source labels when localization is switched off", () => {
    (options.map.localization as { displayMode?: string }).displayMode = undefined;
    expect(MapEntities.getName({ type: "state", id: 1 })).toBe("阿登尼亚");

    options.map.localization.displayMode = "source";
    expect(MapEntities.getName({ type: "state", id: 1 })).toBe("Kingdom of Ardenia");
    expect(MapEntities.getName({ type: "province", id: 1 })).toBe("County of Ravenshire");
    expect(MapEntities.getName({ type: "burg", id: 1 })).toBe("Ravenhold");
    expect(MapEntities.getName({ type: "river", id: 1 })).toBe("Alder River");
    expect(MapEntities.getName({ type: "route", id: 0 })).toBe("King's Road");
    expect(MapEntities.getName({ type: "feature", id: 1 })).toBe("Mirror Lake");
    expect(MapEntities.getName({ type: "marker", id: 1 })).toBe("Mount Doom");
    expect(MapEntities.getName({ type: "zone", id: 1 })).toBe("Plague");
    expect(MapEntities.getName({ type: "journey", id: 0 })).toBe("Pilgrimage");
    expect(MapEntities.getName({ type: "addedLabel", id: 1 })).toBe("Old Name");
  });

  it("round-trips the Chinese layer through entity JSON without changing source values", () => {
    const records = entityRecords();
    for (const record of Object.values(records)) {
      const sourceBefore = JSON.stringify({
        name: "name" in record ? record.name : undefined,
        fullName: "fullName" in record ? record.fullName : undefined,
        text: "label" in record ? record.label.text : undefined
      });
      const restored = JSON.parse(JSON.stringify(record)) as typeof record;
      expect(parseLocalizedNames(restored.localizedNames)?.zh?.text).toBe(record.localizedNames.zh.text);
      const sourceAfter = JSON.stringify({
        name: "name" in restored ? restored.name : undefined,
        fullName: "fullName" in restored ? restored.fullName : undefined,
        text: "label" in restored ? restored.label.text : undefined
      });
      expect(sourceAfter).toBe(sourceBefore);
    }
  });

  it("keeps entity order and the map seed independent of display mode", () => {
    const before = MapEntities.collect("state").map(({ ref }) => ref);
    const seed = options.map.seed;
    options.map.localization.displayMode = "source";
    expect(MapEntities.collect("state").map(({ ref }) => ref)).toEqual(before);
    expect(options.map.seed).toBe(seed);
  });
});

describe("official data without Chinese names", () => {
  it("shows the original name and never invents a translation", () => {
    const state = {
      i: 1,
      name: "Aymar",
      fullName: "Aymar Theocracy",
      label: { text: "Aymar |Theocracy" }
    };
    globalThis.pack.states = [{ i: 0 }, state] as typeof pack.states;

    expect(MapEntities.getName({ type: "state", id: 1 })).toBe("Aymar |Theocracy");
    expect(state).not.toHaveProperty("localizedNames");
  });
});

describe("source hash association", () => {
  it("keeps the stored T03 hash available after JSON loading", () => {
    const restored = JSON.parse(
      JSON.stringify({
        zh: {
          text: "阿尔多里亚",
          sourceName: "Aymar",
          sourceHash: getLocalizedNameSourceHash("Aymar"),
          source: "manual"
        }
      })
    );
    expect(parseLocalizedNames(restored)?.zh?.sourceHash).toBe("1d4d21c9edc3930e");
  });
});

describe("entity renames", () => {
  it("marks the Chinese layer stale without writing Chinese into the source name", () => {
    const state = pack.states[1];
    const chineseText = state.localizedNames?.zh?.text;
    States.rename(1, "Nova");

    expect(state.name).toBe("Nova");
    expect(state.label?.text).toBeUndefined();
    expect(state.localizedNames?.zh).toMatchObject({ text: chineseText, status: "stale" });
  });

  it("marks the Chinese layer stale when a state's full name changes", () => {
    States.setFullName(1, "Grand Duchy of Ardenia");
    expect(pack.states[1].fullName).toBe("Grand Duchy of Ardenia");
    expect(pack.states[1].localizedNames?.zh?.status).toBe("stale");
  });
});

interface RenameCase {
  type: string;
  entity: () => LocalizedNameTestEntity;
  source: () => { name: string; fullName?: string };
  rename: () => void;
  renameToSame: () => void;
}

const renameCases: RenameCase[] = [
  {
    type: "state",
    entity: () => pack.states[1],
    source: () => ({ name: pack.states[1].name, fullName: pack.states[1].fullName }),
    rename: () => States.rename(1, "Nova"),
    renameToSame: () => States.rename(1, "Ardenia")
  },
  {
    type: "province",
    entity: () => pack.provinces[1],
    source: () => ({ name: pack.provinces[1].name, fullName: pack.provinces[1].fullName }),
    rename: () => Provinces.rename(1, "Elm"),
    renameToSame: () => Provinces.rename(1, "Ravenshire")
  },
  {
    type: "burg",
    entity: () => pack.burgs[1],
    source: () => ({ name: pack.burgs[1].name! }),
    rename: () => Burgs.rename(1, "Elmwatch"),
    renameToSame: () => Burgs.rename(1, "Ravenhold")
  },
  {
    type: "river",
    entity: () => pack.rivers[1],
    source: () => ({ name: pack.rivers[1].name }),
    rename: () => Rivers.rename(1, "Brae"),
    renameToSame: () => Rivers.rename(1, "Alder")
  },
  {
    type: "route",
    entity: () => pack.routes[0],
    source: () => ({ name: pack.routes[0].name! }),
    rename: () => Routes.rename(0, "Queen's Road"),
    renameToSame: () => Routes.rename(0, "King's Road")
  },
  {
    type: "feature",
    entity: () => pack.features[1],
    source: () => ({ name: pack.features[1].name }),
    rename: () => Features.rename(1, "Silver Lake"),
    renameToSame: () => Features.rename(1, "Mirror Lake")
  },
  {
    type: "marker",
    entity: () => pack.markers[0],
    source: () => ({ name: pack.markers[0].name }),
    rename: () => Markers.rename(1, "Mount Silence"),
    renameToSame: () => Markers.rename(1, "Mount Doom")
  },
  {
    type: "zone",
    entity: () => pack.zones[1],
    source: () => ({ name: pack.zones[1].name }),
    rename: () => Zones.rename(1, "Famine"),
    renameToSame: () => Zones.rename(1, "Plague")
  },
  {
    type: "journey",
    entity: () => pack.journeys[0],
    source: () => ({ name: pack.journeys[0].name }),
    rename: () => Journeys.rename(0, "Exodus"),
    renameToSame: () => Journeys.rename(0, "Pilgrimage")
  },
  {
    type: "culture",
    entity: () => pack.cultures[1],
    source: () => ({ name: pack.cultures[1].name }),
    rename: () => Cultures.rename(1, "Elmish"),
    renameToSame: () => Cultures.rename(1, "Aeloran")
  },
  {
    type: "religion",
    entity: () => pack.religions[1],
    source: () => ({ name: pack.religions[1].name }),
    rename: () => Religions.rename(1, "Moon Cult"),
    renameToSame: () => Religions.rename(1, "Sun Cult")
  },
  {
    type: "biome",
    entity: () => pack.biomes[1],
    source: () => ({ name: pack.biomes[1].name }),
    rename: () => Biomes.rename(1, "Boreal Forest"),
    renameToSame: () => Biomes.rename(1, "Taiga")
  },
  {
    type: "good",
    entity: () => options.map.goods[0],
    source: () => ({ name: options.map.goods[0].name }),
    rename: () => Goods.rename(1, "Sea Salt"),
    renameToSame: () => Goods.rename(1, "Salt")
  },
  {
    type: "market",
    entity: () => pack.markets[0],
    source: () => ({ name: pack.markets[0].name! }),
    rename: () => Markets.rename(1, "Great Bazaar"),
    renameToSame: () => Markets.rename(1, "Grand Bazaar")
  },
  {
    type: "regiment",
    entity: () => pack.states[1].military![0],
    source: () => ({ name: pack.states[1].military![0].name }),
    rename: () => Military.rename(1, 0, "2nd Cavalry"),
    renameToSame: () => Military.rename(1, 0, "1st Cavalry")
  },
  {
    type: "addedLabel",
    entity: () => pack.addedLabels[0],
    source: () => ({ name: pack.addedLabels[0].label.text ?? "" }),
    rename: () => AddedLabels.rename(1, "New Name"),
    renameToSame: () => AddedLabels.rename(1, "Old Name")
  }
];

describe("all public rename entries", () => {
  it.each(renameCases)("$type marks zh, zhOverride and zhPreview stale", testCase => {
    const entity = testCase.entity();
    const source = testCase.source();
    attachAllSlots(entity, source.name, source.fullName);

    testCase.rename();

    expect(slotStatuses(entity)).toEqual(["stale", "stale", "stale"]);
    expect(entity.localizedNames?.zh?.text).toBe("中文名");
    expect(entity.localizedNames?.zhOverride?.text).toBe("用户覆盖");
    expect(entity.localizedNames?.zhPreview?.text).toBe("预览名");
  });

  it.each(renameCases)("$type does not mark unchanged names stale", testCase => {
    const entity = testCase.entity();
    const source = testCase.source();
    attachAllSlots(entity, source.name, source.fullName);

    testCase.renameToSame();

    expect(slotStatuses(entity)).toEqual(["confirmed", "confirmed", "preview"]);
  });
});

describe("state and province full names and forms", () => {
  it.each([
    ["state setFullName", () => States.setFullName(1, "Grand Duchy of Ardenia"), () => pack.states[1]],
    ["state setForm", () => States.setForm(1, "Duchy"), () => pack.states[1]],
    ["province setFullName", () => Provinces.setFullName(1, "Duchy of Ravenshire"), () => pack.provinces[1]],
    ["province setForm", () => Provinces.setForm(1, "Duchy"), () => pack.provinces[1]]
  ] as const)("%s marks all Chinese slots stale", (_name, change, entityOf) => {
    const entity = entityOf() as LocalizedNameTestEntity & { name: string; fullName: string };
    attachAllSlots(entity, entity.name, entity.fullName);

    change();

    expect(slotStatuses(entity)).toEqual(["stale", "stale", "stale"]);
  });

  it("does not mark unchanged full names stale", () => {
    const state = pack.states[1];
    const province = pack.provinces[1];
    attachAllSlots(state, state.name, state.fullName);
    attachAllSlots(province, province.name, province.fullName);

    States.setFullName(1, state.fullName!);
    Provinces.setFullName(1, province.fullName);

    expect(slotStatuses(state)).toEqual(["confirmed", "confirmed", "preview"]);
    expect(slotStatuses(province)).toEqual(["confirmed", "confirmed", "preview"]);
  });
});
