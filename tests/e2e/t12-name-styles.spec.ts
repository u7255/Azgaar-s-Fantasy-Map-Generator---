import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { waitForMap } from "./wait-for-map";

async function saveCurrentMap(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    let handle: FileSystemFileHandle | undefined;
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: async () => {
        handle = await root.getFileHandle("T12C-name-style.map", { create: true });
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

test.describe("T12-C naming styles and budgets", () => {
  test("changes future previews without rewriting confirmed names", async ({ page }) => {
    await page.goto("/?seed=t12c-name-styles&width=1280&height=720");
    await waitForMap(page);

    const stateId = await page.evaluate(() => {
      const state = FMG.pack.states.find(item => item.i > 0)!;
      state.localizedNames = {
        zh: {
          text: "阿登尼亚",
          source: "manual",
          status: "confirmed",
          sourceName: state.name,
          sourceFullName: state.fullName
        }
      };
      return state.i;
    });

    await page.click("#optionsTrigger");
    await page.click("#localizationTab");
    const style = page.locator("#localizationNameStyle");
    await expect(style).toHaveValue("western-medieval");
    await expect(style.locator("option")).toHaveCount(8);

    await style.selectOption("western-industrial");
    expect(await page.evaluate(id => FMG.pack.states[id].localizedNames?.zh?.text, stateId)).toBe("阿登尼亚");
    expect(await page.evaluate(() => FMG.options.map.localization.nameStyle)).toBe("western-industrial");

    await page.locator("#localizationGenerateMissing").click();
    const preview = await page.evaluate(id => {
      const state = FMG.pack.states[id];
      const burg = FMG.pack.burgs.find(item => item.i > 0 && item.localizedNames?.zhPreview);
      return {
        confirmed: state.localizedNames?.zh?.text,
        statePreview: state.localizedNames?.zhPreview ?? null,
        burgStyle: burg?.localizedNames?.zhPreview?.styleId
      };
    }, stateId);

    expect(preview.confirmed).toBe("阿登尼亚");
    expect(preview.statePreview).toBeNull();
    expect(preview.burgStyle).toBe("western-industrial");

    const mapText = await saveCurrentMap(page);
    await page.locator("#mapToLoad").setInputFiles({
      name: "T12C-name-style.map",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(mapText, "utf8")
    });
    await page.waitForFunction(
      () =>
        FMG.options.map.localization.nameStyle === "western-industrial" &&
        FMG.pack.burgs.some(item => item.i > 0 && item.localizedNames?.zhPreview?.styleId === "western-industrial")
    );
  });

  test("warns on hard-limit previews, skips them by default, then allows an explicit force and clear", async ({
    page
  }) => {
    await page.goto("/?seed=t12c-name-budgets&width=1280&height=720");
    await waitForMap(page);

    const stateId = await page.evaluate(() => {
      const state = FMG.pack.states.find(item => item.i > 0)!;
      state.localizedNames = {
        zhPreview: {
          text: "这是一个超过八个汉字的国家名称",
          source: "transliteration",
          status: "preview",
          sourceName: state.name,
          sourceFullName: state.fullName
        }
      };
      return state.i;
    });

    await page.click("#optionsTrigger");
    await page.click("#localizationTab");
    await page.locator("#localizationFilter").selectOption("long");
    const row = page.locator(`#localizationPanel .localization-row[data-key="state:${stateId}"]`);
    await expect(row).toBeVisible();
    await expect(row.locator(".localization-length.is-hard")).toBeVisible();
    await expect(row.locator(".localization-badge-long")).toBeVisible();

    await page.locator("#localizationApplyPreviews").click();
    await expect(page.locator("#localizationPanelStatus")).toContainText("hard limit");
    expect(await page.evaluate(id => FMG.pack.states[id].localizedNames?.zh, stateId)).toBeUndefined();

    await page.locator("#localizationForceLongNames").check();
    await page.locator("#localizationApplyPreviews").click();
    expect(await page.evaluate(id => FMG.pack.states[id].localizedNames?.zh?.text, stateId)).toBe(
      "这是一个超过八个汉字的国家名称"
    );

    await page
      .locator(`#localizationPanel .localization-row[data-key="state:${stateId}"]`)
      .locator('[data-action="clear"]')
      .click();
    expect(await page.evaluate(id => FMG.pack.states[id].localizedNames, stateId)).toBeUndefined();
  });
});
