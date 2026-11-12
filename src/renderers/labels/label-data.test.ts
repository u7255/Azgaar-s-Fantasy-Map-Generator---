import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalizedName } from "@/model/localization/localized-names";
import { Rivers } from "@/model/physical/river-generator";
import { getLabelsData, getLabelsIndex } from "./label-data";

const fitStateLabel = vi.hoisted(() => vi.fn(() => ({ pathPoints: [[1, 1]], text: "West", fontSize: 100 })));
vi.mock("./fit-state-label", () => ({ fitStateLabel }));

// river.cells carries -1 as a sentinel for "runs off the map edge" (see river-generator,
// which resolves it with projectToNearestEdge). Cell -1 has no entry in pack.cells.p.
const CELL_POINTS: [number, number][] = [
  [0, 0],
  [10, 10],
  [20, 20],
  [30, 30]
];

function stubPack(rivers: unknown[]): void {
  globalThis.pack = {
    states: [],
    provinces: [],
    addedLabels: [],
    burgs: [],
    routes: [],
    rivers,
    cells: { p: CELL_POINTS }
  } as any;
  options.map.labels.groups = [];
  // the label path is not under test here; only the anchor is
  Object.assign(Rivers, { addMeandering: () => [] });
}

describe("river labels with off-map cells", () => {
  beforeEach(() => {
    stubPack([]);
  });

  it("anchors a two-cell river whose second cell runs off the map edge", () => {
    // the middle of a 2-cell river is index 1, which is exactly where the sentinel sits
    stubPack([{ i: 1, name: "Kobat", type: "River", cells: [2, -1], points: [] }]);

    const labels = getLabelsData();

    const river = labels.find(label => label.type === "river");
    expect(river).toBeDefined();
    expect(river?.anchor).toEqual([20, 20]); // the real cell, not the sentinel
  });

  it("anchors a single-cell river that only touches the edge", () => {
    stubPack([{ i: 1, name: "Edge", type: "River", cells: [-1], points: [] }]);

    expect(() => getLabelsData()).not.toThrow();
  });

  it("still anchors on the middle cell when no cell is off-map", () => {
    stubPack([{ i: 1, name: "Inland", type: "River", cells: [0, 1, 2], points: [] }]);

    const river = getLabelsData().find(label => label.type === "river");
    expect(river?.anchor).toEqual([10, 10]);
  });

  // old saves can carry rivers whose cells array was never assigned
  it("skips a river that has no cells array", () => {
    stubPack([{ i: 1, name: "Colorado", type: "River" }]);

    expect(() => getLabelsData()).not.toThrow();
    expect(getLabelsData().find(label => label.type === "river")).toBeUndefined();
  });
});

it("includes the first route, whose valid ID is zero", () => {
  stubPack([]);
  pack.routes = [
    {
      i: 0,
      name: "Old Road",
      points: [
        [10, 10, 1],
        [20, 20, 2]
      ]
    }
  ] as typeof pack.routes;
  const label = getLabelsData().find(label => label.type === "route");
  expect(label?.entityId).toBe(0);
  expect(label?.text).toBe("Old Road");
});

it("renders Chinese names for every label-backed entity and restores their source labels", () => {
  stubPack([{ i: 1, name: "Kobat", type: "River", cells: [0, 1, 2], points: [], label: { text: "Kobat River" } }]);
  pack.states = [
    { i: 0 },
    {
      i: 1,
      name: "West",
      fullName: "Kingdom of West",
      label: { text: "West", pathPoints: [] },
      localizedNames: {
        zh: createLocalizedName({ text: "西境", sourceName: "West", sourceFullName: "Kingdom of West" })
      }
    }
  ] as unknown as typeof pack.states;
  pack.provinces = [
    { i: 0 },
    {
      i: 1,
      name: "Raven",
      fullName: "County of Raven",
      pole: [10, 10],
      label: { text: "Raven", pathPoints: [] },
      localizedNames: {
        zh: createLocalizedName({ text: "渡鸦郡", sourceName: "Raven", sourceFullName: "County of Raven" })
      }
    }
  ] as unknown as typeof pack.provinces;
  pack.burgs = [
    0,
    {
      i: 1,
      name: "Vaeltown",
      x: 20,
      y: 20,
      label: { text: "Vaeltown" },
      localizedNames: { zh: createLocalizedName({ text: "维尔镇", sourceName: "Vaeltown" }) }
    }
  ] as unknown as typeof pack.burgs;
  pack.rivers[0].localizedNames = { zh: createLocalizedName({ text: "科巴特河", sourceName: "Kobat" }) };
  pack.routes = [
    {
      i: 0,
      name: "Old Road",
      group: "roads",
      feature: 1,
      points: [
        [10, 10, 1],
        [20, 20, 2]
      ],
      label: { text: "Old Road" },
      localizedNames: { zh: createLocalizedName({ text: "旧路", sourceName: "Old Road" }) }
    }
  ] as typeof pack.routes;
  pack.addedLabels = [
    {
      i: 1,
      x: 30,
      y: 30,
      label: { text: "Aldor", group: "added" },
      localizedNames: { zh: createLocalizedName({ text: "阿尔多", sourceName: "Aldor" }) }
    }
  ] as unknown as typeof pack.addedLabels;
  options.map.localization.displayMode = "zh";

  const texts = () => Object.fromEntries(getLabelsData().map(label => [label.type, label.text]));
  expect(texts()).toEqual({
    state: "西境",
    river: "科巴特河",
    route: "旧路",
    province: "渡鸦郡",
    burg: "维尔镇",
    added: "阿尔多"
  });

  options.map.localization.displayMode = "bilingual";
  expect(texts()).toEqual({
    state: "西境 · West",
    river: "科巴特河 · Kobat River",
    route: "旧路 · Old Road",
    province: "渡鸦郡 · Raven",
    burg: "维尔镇 · Vaeltown",
    added: "阿尔多 · Aldor"
  });

  options.map.localization.displayMode = "source";
  expect(texts()).toEqual({
    state: "West",
    river: "Kobat River",
    route: "Old Road",
    province: "Raven",
    burg: "Vaeltown",
    added: "Aldor"
  });
});

describe("labels index", () => {
  beforeEach(() => {
    stubPack([{ i: 1, name: "Kobat", type: "River", cells: [0, 1, 2], points: [] }]);
    pack.states = [
      { i: 0 },
      { i: 1, name: "West", fullName: "Kingdom of West", cells: 5, center: 1 }
    ] as typeof pack.states;
    Object.assign(Rivers, { addMeandering: vi.fn(() => []) });
    fitStateLabel.mockClear();
  });

  it("names and anchors every label without fitting state paths or meandering rivers", () => {
    const index = getLabelsIndex();
    expect(index.map(label => [label.id, label.text])).toEqual([
      ["stateLabel1", "Kingdom of West"],
      ["riverLabel1", "Kobat River"]
    ]);
    expect(index.find(label => label.type === "river")?.anchor).toEqual([10, 10]);
    expect(fitStateLabel).not.toHaveBeenCalled();
    expect(Rivers.addMeandering).not.toHaveBeenCalled();
  });

  it("skips a state with no cells, as the full build does", () => {
    pack.states[1].cells = 0;
    expect(getLabelsIndex().find(label => label.type === "state")).toBeUndefined();
    expect(getLabelsData().find(label => label.type === "state")).toBeUndefined();
    expect(fitStateLabel).not.toHaveBeenCalled();
  });

  it("lists exactly the labels the full build renders", () => {
    pack.states.push(
      ...([
        { i: 2, name: "Void", cells: 0, center: 1 },
        { i: 3, name: "Plain", cells: 0, center: 1, label: { text: "Plain", pathPoints: [] } }
      ] as typeof pack.states)
    );
    const ids = (labels: { id: string }[]) => labels.map(label => label.id);
    expect(ids(getLabelsIndex())).toEqual(ids(getLabelsData()));
    expect(ids(getLabelsIndex()).includes("stateLabel3")).toBe(true); // plain text needs no cells to fit into
    expect(ids(getLabelsIndex()).includes("stateLabel2")).toBe(false);
  });

  it("still fits state labels for the full build", () => {
    expect(getLabelsData().find(label => label.type === "state")?.text).toBe("West");
    expect(fitStateLabel).toHaveBeenCalledTimes(1);
  });
});
