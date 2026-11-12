import { expect, test } from "@playwright/test";
import { waitForMap } from "./wait-for-map";

declare const FMG: any;

async function redrawLocalizedLabels(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await FMG.Controllers.LocalizationPanel.open();
    const bilingual = document.getElementById("localizationDisplayMode") as HTMLSelectElement;
    bilingual.value = "bilingual";
    bilingual.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 100));
    const chinese = document.getElementById("localizationDisplayMode") as HTMLSelectElement;
    chinese.value = "zh";
    chinese.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 150));
    FMG.Dialog.closeAll();
  });
}

async function visibleLabelBoxes(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<SVGTextElement>("#labels text"))
      .filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 1 && rect.height > 1;
      })
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.id,
          text: element.textContent,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom
        };
      })
  );
}

test("fits and separates a long localized state name", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?seed=t10-long-labels&width=1366&height=768");
  await waitForMap(page);

  const stateId = await page.evaluate(() => {
    const state = FMG.pack.states.find((item: any) => item.i > 0 && item.name && !item.removed);
    state.localizedNames = {
      zh: {
        text: "神圣阿尔多里亚联合王国",
        sourceName: state.name,
        source: "manual",
        status: "confirmed"
      }
    };
    FMG.options.map.localization = { displayMode: "zh", mapFont: "song-ke" };
    return state.i;
  });
  await redrawLocalizedLabels(page);

  const metrics = await page.evaluate(id => {
    const text = document.getElementById(`stateLabel${id}`) as SVGTextElement;
    const path = document.getElementById(`textPath_stateLabel${id}`) as SVGPathElement;
    const rect = text.getBoundingClientRect();
    const map = document.getElementById("map")!.getBoundingClientRect();
    return {
      text: text.textContent,
      visible: rect.width > 1 && rect.height > 1,
      textLength: text.getComputedTextLength(),
      pathLength: path.getTotalLength(),
      insideMap:
        rect.left >= map.left - 1 &&
        rect.top >= map.top - 1 &&
        rect.right <= map.right + 1 &&
        rect.bottom <= map.bottom + 1
    };
  }, stateId);

  expect(metrics.text).toBe("神圣阿尔多里亚联合王国");
  expect(metrics.visible).toBe(true);
  expect(metrics.insideMap).toBe(true);
  expect(metrics.textLength).toBeLessThanOrEqual(metrics.pathLength);

  const boxes = await visibleLabelBoxes(page);
  const overlaps = boxes.flatMap((left, leftIndex) =>
    boxes.slice(leftIndex + 1).flatMap(right => {
      const overlapX = Math.min(left.right, right.right) - Math.max(left.left, right.left);
      const overlapY = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
      return overlapX > 1 && overlapY > 1 ? [[left.id, right.id]] : [];
    })
  );
  expect(overlaps).toEqual([]);
});

test("fits a long localized river name on its path", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?seed=t10-long-river&width=1366&height=768");
  await waitForMap(page);

  const riverId = await page.evaluate(() => {
    const river = FMG.pack.rivers.find((item: any) => item.i > 0 && item.name && !item.removed);
    river.localizedNames = {
      zh: {
        text: "银月蜿蜒大河",
        sourceName: river.name,
        source: "manual",
        status: "confirmed"
      }
    };
    FMG.options.map.localization = { displayMode: "zh", mapFont: "song-ke" };
    FMG.options.app.labels.showAll = true;
    for (const group of FMG.options.map.labels.groups) group.active = group.name === "river";
    return river.i;
  });
  await redrawLocalizedLabels(page);

  const metrics = await page.evaluate(id => {
    const text = document.getElementById(`riverLabel${id}`) as SVGTextElement;
    const path = document.getElementById(`textPath_riverLabel${id}`) as SVGPathElement;
    const rect = text.getBoundingClientRect();
    return {
      text: text.textContent,
      visible: rect.width > 1 && rect.height > 1,
      textLength: text.getComputedTextLength(),
      pathLength: path.getTotalLength()
    };
  }, riverId);

  expect(metrics.text).toBe("银月蜿蜒大河");
  expect(metrics.visible).toBe(true);
  expect(metrics.textLength).toBeLessThanOrEqual(metrics.pathLength);
});

test("shows a long localized province name without truncation", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?seed=t10-long-province&width=1366&height=768");
  await waitForMap(page);

  const provinceId = await page.evaluate(() => {
    const province = FMG.pack.provinces.find(
      (item: any) => item.i > 0 && item.name && !item.removed && !item.label?.hidden
    );
    province.localizedNames = {
      zh: {
        text: "北境远疆总督行省",
        sourceName: province.name,
        source: "manual",
        status: "confirmed"
      }
    };
    FMG.options.map.localization = { displayMode: "zh", mapFont: "song-ke" };
    FMG.options.app.labels.showAll = true;
    FMG.Layers.show("provinces");
    for (const group of FMG.options.map.labels.groups) group.active = group.name === "province";
    return province.i;
  });
  await redrawLocalizedLabels(page);

  const metrics = await page.evaluate(id => {
    const text = document.getElementById(`provinceLabel${id}`) as SVGTextElement;
    const rect = text.getBoundingClientRect();
    return {
      text: text.textContent,
      visible: rect.width > 1 && rect.height > 1
    };
  }, provinceId);

  expect(metrics.text).toBe("北境远疆总督行省");
  expect(metrics.visible).toBe(true);
});
