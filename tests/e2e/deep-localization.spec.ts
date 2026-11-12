import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { waitForMap } from "./wait-for-map";

test.describe("deep localization", () => {
  test("opens from the shell tab and keeps the three display modes available", async ({ page }) => {
    await page.goto("/?seed=deep-localization-entry&width=1280&height=720");
    await waitForMap(page);
    await page.click("#optionsTrigger");
    await page.click("#localizationTab");

    await expect(page.locator("#localizationPanel")).toBeVisible();
    await expect(page.locator("#localizationDisplayMode")).toHaveValue("zh");
    await expect(page.locator("#localizationDisplayMode option")).toHaveCount(3);
    await expect(page.locator("#localizationMapFont option")).toHaveCount(4);
    await expect(page.locator("#localizationApplyPreviews")).toBeVisible();
  });

  test("is operable at 480px with batch previews, undo and no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto("/?seed=deep-localization-480&width=480&height=800");
    await waitForMap(page);
    await page.click("#optionsTrigger");
    await page.click("#localizationTab");

    await page.locator("#localizationDisplayMode").selectOption("bilingual");
    expect(await page.evaluate(() => (window as any).options.map.localization.displayMode)).toBe("bilingual");
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector("#localizationDisplayMode")!).fontFamily)
    ).toContain("Helvetica");

    await page.locator("#localizationGenerateMissing").click();
    await expect(page.locator("#localizationPanelStatus")).toContainText("previews");
    await expect(page.locator("#localizationUndo")).toBeEnabled();
    await page.locator("#localizationUndo").click();

    const metrics = await page.evaluate(() => {
      const panel = document.getElementById("localizationPanel")!;
      const dialog = panel.closest<HTMLElement>(".dialog-window")!;
      const dialogBox = dialog.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        panelClientWidth: panel.clientWidth,
        panelScrollWidth: panel.scrollWidth,
        dialogLeft: dialogBox.left,
        dialogRight: dialogBox.right,
        rowOverflow: Array.from(panel.querySelectorAll<HTMLElement>(".localization-row")).some(
          row => row.scrollWidth > row.clientWidth + 1
        )
      };
    });

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.dialogLeft).toBeGreaterThanOrEqual(-1);
    expect(metrics.dialogRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.panelScrollWidth).toBeLessThanOrEqual(metrics.panelClientWidth + 1);
    expect(metrics.rowOverflow).toBe(false);
    fs.mkdirSync(".cache/t06", { recursive: true });
    fs.writeFileSync(".cache/t06/narrow-viewport.json", JSON.stringify(metrics, null, 2));
  });

  test("opens the novel gazetteer from the deep localization panel", async ({ page }) => {
    await page.goto("/?seed=deep-localization-gazetteer&width=1280&height=720");
    await waitForMap(page);
    await page.click("#optionsTrigger");
    await page.click("#localizationTab");

    const entry = page.locator("#localizationGazetteer");
    await expect(entry).toBeVisible();
    await expect(entry).toBeEnabled();
    await entry.click();
    await expect(page.locator("#novelGazetteerDialog")).toBeVisible();
    await expect(page.locator("#novelGazetteerIncludePreview")).not.toBeChecked();
  });
});
