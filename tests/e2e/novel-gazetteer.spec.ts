import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { waitForMap } from "./wait-for-map";

async function openGazetteer(page: import("@playwright/test").Page, seed: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(`/?seed=${seed}&width=${width}&height=${height}`);
  await waitForMap(page);
  await page.click("#optionsTrigger");
  await page.click("#localizationTab");
  await page.click("#localizationGazetteer");
  await expect(page.locator("#novelGazetteerDialog")).toBeVisible();
}

test.describe("novel gazetteer export", () => {
  test("exports Excel-friendly CSV with the required fields", async ({ page }) => {
    await openGazetteer(page, "t09-csv", 1280, 720);

    await expect(page.locator("#novelGazetteerFormat option")).toHaveCount(3);
    await expect(page.locator("#novelGazetteerMode option")).toHaveCount(3);
    await expect(page.locator("#novelGazetteerIncludePreview")).not.toBeChecked();
    await page.locator("#novelGazetteerFormat").selectOption("csv");

    const downloadPromise = page.waitForEvent("download");
    await page.click("#novelGazetteerExport");
    const download = await downloadPromise;
    const buffer = fs.readFileSync(await download.path());

    expect([...buffer.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = buffer.toString("utf8");
    expect(text).toContain("Type,Chinese name,Original,Pinyin,Aliases,Country,Province,Population,Note summary,Related entities");
    await expect(page.locator(".novel-status")).toContainText(".csv");
  });

  test("stays usable at 480px and exposes every mode and preview choice", async ({ page }) => {
    await openGazetteer(page, "t09-narrow", 480, 800);

    await expect(page.locator("#novelGazetteerMode option")).toHaveText(["Chinese", "Bilingual", "Original"]);
    await expect(page.locator(".novel-summary")).toContainText("Unconfirmed previews excluded");
    await page.locator("#novelGazetteerIncludePreview").check();
    await expect(page.locator(".novel-summary")).toContainText("Unconfirmed previews included");
    await page.locator("#novelGazetteerMode").selectOption("source");
    await page.locator("#novelGazetteerFormat").selectOption("json");

    const metrics = await page.evaluate(() => {
      const panel = document.getElementById("novelGazetteerDialog")!;
      const dialog = panel.closest<HTMLElement>(".dialog-window")!;
      const dialogBox = dialog.getBoundingClientRect();
      const toolbar = panel.querySelector<HTMLElement>(".novel-toolbar")!;
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        dialogLeft: dialogBox.left,
        dialogRight: dialogBox.right,
        panelClientWidth: panel.clientWidth,
        panelScrollWidth: panel.scrollWidth,
        toolbarColumns: getComputedStyle(toolbar).gridTemplateColumns.split(" ").length
      };
    });

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.dialogLeft).toBeGreaterThanOrEqual(-1);
    expect(metrics.dialogRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.panelScrollWidth).toBeLessThanOrEqual(metrics.panelClientWidth + 1);
    expect(metrics.toolbarColumns).toBe(1);
  });
});
