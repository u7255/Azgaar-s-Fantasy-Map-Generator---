import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { waitForMap } from "./wait-for-map";

declare const FMG: any;

const COMMON_FORM_LABELS: Record<string, string> = {
  "City-state": "城邦",
  County: "郡",
  Duchy: "公国",
  Empire: "帝国",
  Federation: "联邦",
  "Free City": "自由市",
  "Grand Duchy": "大公国",
  Kingdom: "王国",
  Principality: "亲王国",
  Province: "省",
  Republic: "共和国",
  Theocracy: "神权国"
};

async function saveCurrentMap(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    let handle: FileSystemFileHandle | undefined;
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: async () => {
        handle = await root.getFileHandle("T12B-roundtrip.map", { create: true });
        return handle;
      }
    });

    await FMG.Services.Save.toMachine();
    if (!handle) throw new Error("Save did not request a file handle");
    for (let attempt = 0; attempt < 30; attempt++) {
      const file = await handle.getFile();
      if (file.size > 0) return file.text();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Save produced an empty map");
  });
}

test.describe("T12-B localized entity editors", () => {
  test("shows Chinese names and edits an override without changing the source", async ({ page }) => {
    await page.goto("/?seed=t12b-name-editors&width=1400&height=900");
    await waitForMap(page);

    const ids = await page.evaluate(() => {
      const { pack, options } = FMG;
      const chinese = (sourceName: string, text: string, sourceFullName?: string) => ({
        zh: { text, sourceName, sourceFullName, source: "manual", status: "confirmed" }
      });
      const burg = pack.burgs.find(
        (item: any) =>
          item.i &&
          !item.removed &&
          pack.cells.province[item.cell] &&
          pack.provinces[pack.cells.province[item.cell]] &&
          pack.states[item.state]?.i
      );
      const province = burg ? pack.provinces[pack.cells.province[burg.cell]] : undefined;
      const state = burg ? pack.states[burg.state] : undefined;
      const river = pack.rivers.find((item: any) => item.i && !item.removed);
      const route = pack.routes.find((item: any) => item.i !== undefined && item.points?.length >= 2);

      if (!state || !province || !burg || !river || !route) throw new Error("The seed map lacks a T12-B entity");

      state.localizedNames = chinese(state.name, "奥文", state.fullName);
      province.localizedNames = chinese(province.name, "曙光郡", province.fullName);
      burg.localizedNames = chinese(burg.name, "鸦港");
      river.localizedNames = chinese(river.name, "赤杨河");
      route.localizedNames = chinese(route.name, "国王大道");
      options.map.localization.displayMode = "zh";

      return {
        state: { id: state.i, name: state.name, fullName: state.fullName, formName: state.formName },
        province: { id: province.i, name: province.name, formName: province.formName },
        burg: { id: burg.i, name: burg.name },
        river: { id: river.i, name: river.name },
        route: { id: route.i, name: route.name }
      };
    });

    const stateForm = COMMON_FORM_LABELS[ids.state.formName] ?? ids.state.formName;
    const provinceForm = COMMON_FORM_LABELS[ids.province.formName] ?? ids.province.formName;

    await page.evaluate(() => FMG.Controllers.StatesEditor.open());
    let row = page.locator(`#statesBodySection .states[data-id="${ids.state.id}"]`);
    await expect(row.locator('[data-col="name"]')).toHaveValue("奥文");
    await expect(row.locator('[data-col="form"]')).toHaveValue(stateForm);

    await page.evaluate(() => FMG.Controllers.ProvincesEditor.open());
    row = page.locator(`#provincesBodySection .states[data-id="${ids.province.id}"]`);
    await expect(row.locator('[data-col="name"]')).toHaveValue("曙光郡");
    await expect(row.locator('[data-col="form"]')).toHaveValue(provinceForm);

    await page.evaluate(() => FMG.Controllers.BurgsOverview.open());
    row = page.locator(`#burgsBody .states[data-id="${ids.burg.id}"]`);
    await expect(row.locator('[data-col="name"]')).toHaveValue("鸦港");
    await expect(row.locator('[data-col="state"]')).toHaveValue("奥文");
    await expect(row.locator('[data-col="province"]')).toHaveValue("曙光郡");
    await row.locator('[data-col="edit"]').click();
    await expect(page.locator("#burgEditor")).toBeVisible();
    await expect(page.locator("#burgChineseName")).toHaveValue("鸦港");
    await expect(page.locator("#burgName")).toHaveValue(ids.burg.name);

    await page.locator("#burgChineseName").fill("鸦港新名");
    await page.locator("#burgChineseName").dispatchEvent("change");
    const burgState = await page.evaluate(id => {
      const burg = FMG.pack.burgs[id];
      return {
        source: burg.name,
        override: burg.localizedNames?.zhOverride,
        display: FMG.MapEntities.getName({ type: "burg", id })
      };
    }, ids.burg.id);
    expect(burgState).toMatchObject({
      source: ids.burg.name,
      override: { text: "鸦港新名", source: "user", status: "confirmed" },
      display: "鸦港新名"
    });

    await page.evaluate(() => FMG.Controllers.RiversOverview.open());
    row = page.locator(`#riversBody .states[data-id="${ids.river.id}"]`);
    await expect(row.locator('[data-col="name"]')).toHaveValue("赤杨河");
    await expect(row.locator('[data-col="basin"]')).toHaveValue("赤杨河");

    await page.evaluate(() => FMG.Controllers.RoutesOverview.open());
    row = page.locator(`#routesBody .states[data-id="${ids.route.id}"]`);
    await expect(row.locator('[data-col="name"]')).toHaveValue("国王大道");

    await page.evaluate(() => FMG.Dialog.closeAll());
    await page.evaluate(() => FMG.Controllers.StatesEditor.open());
    await page.evaluate(() => FMG.Controllers.LocalizationPanel.open());
    await page.locator("#localizationDisplayMode").selectOption("source");
    row = page.locator(`#statesBodySection .states[data-id="${ids.state.id}"]`);
    await expect(row.locator('[data-col="name"]')).toHaveValue(ids.state.name);

    const sourceStillIntact = await page.evaluate(id => {
      const state = FMG.pack.states[id];
      const burg = FMG.pack.burgs.find((item: any) => item.localizedNames?.zhOverride?.text === "鸦港新名");
      return {
        state: { name: state.name, fullName: state.fullName, formName: state.formName },
        burgSource: burg?.name
      };
    }, ids.state.id);
    expect(sourceStillIntact.state).toEqual({
      name: ids.state.name,
      fullName: ids.state.fullName,
      formName: ids.state.formName
    });
    expect(sourceStillIntact.burgSource).toBe(ids.burg.name);
  });

  test("round-trips all five Chinese overrides without changing source names", async ({ page }) => {
    await page.goto("/?seed=t12b-override-roundtrip&width=1400&height=900");
    await waitForMap(page);

    const before = await page.evaluate(() => {
      const { pack } = FMG;
      const burg = pack.burgs.find(
        (item: any) =>
          item.i &&
          !item.removed &&
          pack.cells.province[item.cell] &&
          pack.provinces[pack.cells.province[item.cell]] &&
          pack.states[item.state]?.i
      );
      const province = burg ? pack.provinces[pack.cells.province[burg.cell]] : undefined;
      const state = burg ? pack.states[burg.state] : undefined;
      const river = pack.rivers.find((item: any) => item.i && !item.removed);
      const route = pack.routes.find((item: any) => item.i !== undefined && item.points?.length >= 2);
      if (!state || !province || !burg || !river || !route) throw new Error("The seed map lacks a T12-B entity");

      const refs = {
        state: { type: "state", id: state.i },
        province: { type: "province", id: province.i },
        burg: { type: "burg", id: burg.i },
        river: { type: "river", id: river.i },
        route: { type: "route", id: route.i }
      } as const;
      const texts = { state: "奥文", province: "曙光郡", burg: "鸦港", river: "赤杨河", route: "国王大道" };
      for (const [type, ref] of Object.entries(refs))
        FMG.MapEntities.setChineseOverride(ref, texts[type as keyof typeof texts]);

      const source = (entity: any) => ({
        name: entity.name,
        fullName: entity.fullName,
        formName: entity.formName
      });
      return {
        ids: {
          state: state.i,
          province: province.i,
          burg: burg.i,
          river: river.i,
          route: route.i
        },
        source: {
          state: source(state),
          province: source(province),
          burg: source(burg),
          river: source(river),
          route: source(route)
        }
      };
    });

    const mapText = await saveCurrentMap(page);
    await page.locator("#mapToLoad").setInputFiles({
      name: "T12B-roundtrip.map",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(mapText, "utf8")
    });
    await page.waitForFunction(
      id => FMG.pack?.burgs?.[id]?.localizedNames?.zhOverride?.text === "鸦港",
      before.ids.burg
    );

    const after = await page.evaluate(ids => {
      const source = (entity: any) => ({
        name: entity.name,
        fullName: entity.fullName,
        formName: entity.formName
      });
      const { pack } = FMG;
      return {
        source: {
          state: source(pack.states[ids.state]),
          province: source(pack.provinces[ids.province]),
          burg: source(pack.burgs[ids.burg]),
          river: source(pack.rivers.find((item: any) => item.i === ids.river)),
          route: source(pack.routes.find((item: any) => item.i === ids.route))
        },
        overrides: {
          state: pack.states[ids.state]?.localizedNames?.zhOverride?.text,
          province: pack.provinces[ids.province]?.localizedNames?.zhOverride?.text,
          burg: pack.burgs[ids.burg]?.localizedNames?.zhOverride?.text,
          river: pack.rivers.find((item: any) => item.i === ids.river)?.localizedNames?.zhOverride?.text,
          route: pack.routes.find((item: any) => item.i === ids.route)?.localizedNames?.zhOverride?.text
        }
      };
    }, before.ids);

    expect(after.source).toEqual(before.source);
    expect(after.overrides).toEqual({
      state: "奥文",
      province: "曙光郡",
      burg: "鸦港",
      river: "赤杨河",
      route: "国王大道"
    });
  });
});
