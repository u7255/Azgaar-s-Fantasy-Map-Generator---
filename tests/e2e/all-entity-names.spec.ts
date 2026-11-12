import { expect, test } from "@playwright/test";
import { waitForMap } from "./wait-for-map";

declare const FMG: any;

async function attachLocalizedNames(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const { pack, options } = FMG;
    const localized = (sourceName: string, text: string) => ({
      zh: { text, sourceName, source: "manual", status: "confirmed" }
    });
    const assign = (entity: any, text: string, sourceName = entity.name) => {
      entity.localizedNames = localized(sourceName, text);
      return entity.i;
    };

    const culture = pack.cultures.find((item: any) => item.i && !item.removed);
    const religion = pack.religions.find((item: any) => item.i && !item.removed);
    const biome = pack.biomes.find((item: any) => item.i && !item.removed);
    const good = options.map.goods.find((item: any) => item.name);
    const market = pack.markets.find((item: any) => item.i);
    const state = pack.states.find((item: any) => item.i && !item.removed);
    if (state && !state.military?.length) {
      state.military = [
        {
          i: 0,
          a: 1,
          cell: state.center,
          t: 1,
          s: 0,
          name: "1st Cavalry",
          u: {},
          n: 0,
          x: state.pole?.[0] ?? 0,
          y: state.pole?.[1] ?? 0,
          bx: state.pole?.[0] ?? 0,
          by: state.pole?.[1] ?? 0,
          type: "cavalry",
          icon: "",
          state: state.i,
          tags: []
        }
      ];
    }
    const regiment = state?.military?.[0];
    const feature = pack.features.find((item: any) => item.i && !item.removed);

    pack.journeys ??= [];
    pack.zones ??= [];
    pack.addedLabels ??= [];
    if (!pack.journeys.length) {
      pack.journeys.push({ i: 0, name: "Pilgrimage", type: "Quest", color: "#fff", segments: [] });
    }
    if (!pack.zones.length) {
      pack.zones.push({ i: 0, name: "Plague", type: "Disease", color: "#fff", cells: [], tags: [] });
    }
    if (!pack.addedLabels.length) {
      pack.addedLabels.push({ i: 1, x: 0, y: 0, label: { text: "Old Label", group: "added" } });
    }
    const journey = pack.journeys[0];
    const zone = pack.zones[0];
    const addedLabel = pack.addedLabels[0];

    const ids = {
      culture: culture?.i,
      religion: religion?.i,
      biome: biome?.i,
      good: good?.i,
      market: market?.i,
      state: state?.i,
      regiment: regiment?.i,
      feature: feature?.i,
      journey: journey?.i,
      zone: zone?.i,
      addedLabel: addedLabel?.i
    };
    if (culture) assign(culture, "精灵文化");
    if (religion) assign(religion, "太阳教团");
    if (biome) assign(biome, "泰加林");
    if (good) assign(good, "盐");
    if (market) assign(market, "大集市", pack.burgs[market.centerBurgId]?.name);
    if (regiment) assign(regiment, "第一骑兵团");
    if (feature) assign(feature, "镜湖");
    assign(journey, "朝圣之旅");
    assign(zone, "疫病");
    assign(addedLabel, "旧标签", addedLabel.label.text);
    options.map.lore.localizedNames = localized(options.map.lore.name, "瓦尔卡亚");
    options.map.localization.displayMode = "zh";

    return ids;
  });
}

test.describe("T08 all entity names", () => {
  test("resolves ten named categories and searches their Chinese names in tables", async ({ page }) => {
    await page.goto("/?seed=t08-all-entities&width=1400&height=900");
    await waitForMap(page);
    const ids = await attachLocalizedNames(page);

    const names = await page.evaluate(
      ids => [
        FMG.MapEntities.getName({ type: "culture", id: ids.culture }),
        FMG.MapEntities.getName({ type: "religion", id: ids.religion }),
        FMG.MapEntities.getName({ type: "biome", id: ids.biome }),
        FMG.MapEntities.getName({ type: "good", id: ids.good }),
        FMG.MapEntities.getName({ type: "market", id: ids.market }),
        FMG.MapEntities.getName({ type: "regiment", id: ids.state, sub: ids.regiment }),
        FMG.MapEntities.getName({ type: "journey", id: ids.journey }),
        FMG.MapEntities.getName({ type: "zone", id: ids.zone }),
        FMG.MapEntities.getName({ type: "feature", id: ids.feature }),
        FMG.Lore.getName()
      ],
      ids
    );
    expect(names).toEqual([
      "精灵文化",
      "太阳教团",
      "泰加林",
      "盐",
      "大集市",
      "第一骑兵团",
      "朝圣之旅",
      "疫病",
      "镜湖",
      "瓦尔卡亚"
    ]);

    const tables = [
      ["CulturesEditor", "culturesEditor", "culturesSearch", "精灵文化"],
      ["ReligionsEditor", "religionsEditor", "religionsSearch", "太阳教团"],
      ["BiomesEditor", "biomesEditor", "biomesSearch", "泰加林"],
      ["GoodsEditor", "goodsEditor", "goodsSearch", "盐"],
      ["MarketsOverview", "marketsOverview", "marketsOverviewSearch", "大集市"],
      ["RegimentsOverview", "regimentsOverview", "regimentsSearch", "第一骑兵团"],
      ["JourneysOverview", "journeysOverview", "journeysSearch", "朝圣之旅"],
      ["ZonesEditor", "zonesEditor", "zonesSearch", "疫病"],
      ["FeaturesOverview", "featuresOverview", "featuresSearch", "镜湖"]
    ] as const;
    for (const [controller, dialogId, inputId, chinese] of tables) {
      await page.evaluate(async name => FMG.Controllers[name].open(), controller);
      await expect(page.locator(`#${dialogId}`)).toBeVisible();
      if (dialogId === "religionsEditor") await page.locator("#religionsExtinct").click();
      await page.locator(`#${inputId}`).fill(chinese);
      await expect(page.locator(`#${dialogId}`)).toContainText(chinese);
    }
  });

  test("finds localized names in Omnibar and labels", async ({ page }) => {
    await page.goto("/?seed=t08-entity-export&width=1200&height=800");
    await waitForMap(page);
    await attachLocalizedNames(page);

    await page.evaluate(() => FMG.Controllers.LabelsOverview.open());
    await page.locator("#labelsSearch").fill("旧标签");
    await expect(page.locator("#labelsOverview")).toContainText("旧标签");

    await page.evaluate(() => FMG.Controllers.Omnibar.open());
    await page.locator("#omnibar-input").fill("精灵文化");
    await expect(page.locator("#omnibar-list")).toContainText("精灵文化");
    await page.locator("#omnibar-input").fill("瓦尔卡亚");
    await expect(page.locator("#omnibar-list")).toContainText("瓦尔卡亚");
  });
});
