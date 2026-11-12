// Browser-mode test (vitest.browser.config.ts): label groups carry their shift as a transform
// derived from the store, not as retired data-dx/data-dy attributes.
import { afterEach, beforeAll, expect, test } from "vitest";
import "@/model/styles/styles";
import type { OptionsData } from "@/model/options/options-schema";
import { writeGroupStyle } from "./label-groups";

const localization = { displayMode: "zh" as const, mapFont: "song-ke" as const };

beforeAll(() => {
  globalThis.options = {
    map: { localization: { ...localization } }
  } as OptionsData;
});

afterEach(() => {
  globalThis.options.map.localization = { ...localization };
});

test("writeGroupStyle applies the CSS text without stamping data attrs", () => {
  document.body.innerHTML = `<svg id="map"><g id="labels"></g></svg>`;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  document.getElementById("labels")!.appendChild(group);

  const groupStyle = structuredClone(styles.labels.groups.capital);
  groupStyle.attrs.style = "text-shadow: white 0px 0px 4px; transform: translate(1.5em, -0.5em)";
  groupStyle.attrs["font-weight"] = 700;
  writeGroupStyle(group, groupStyle);

  expect(group.style.cssText).toBe("text-shadow: white 0px 0px 4px; transform: translate(1.5em, -0.5em);");
  expect(group.getAttribute("font-weight")).toBe("700");
  expect(group.getAttribute("data-dx")).toBeNull();
  expect(group.getAttribute("data-dy")).toBeNull();
});

test("writeGroupStyle layers the selected Chinese face without changing the source style", () => {
  document.body.innerHTML = `<svg id="map"><g id="labels"></g></svg>`;
  const group = document.querySelector("g")!;
  const groupStyle = structuredClone(styles.labels.groups.capital);
  const originalFamily = groupStyle.attrs["font-family"];

  globalThis.options.map.localization = { displayMode: "zh", mapFont: "wen-kai" };
  writeGroupStyle(group, groupStyle);
  expect(group.getAttribute("font-family")).toContain('"LXGW WenKai"');
  expect(group.getAttribute("font-family")).toContain(originalFamily);
  expect(groupStyle.attrs["font-family"]).toBe(originalFamily);

  globalThis.options.map.localization = { displayMode: "source", mapFont: "wen-kai" };
  writeGroupStyle(group, groupStyle);
  expect(group.getAttribute("font-family")).toBe(originalFamily);
});
