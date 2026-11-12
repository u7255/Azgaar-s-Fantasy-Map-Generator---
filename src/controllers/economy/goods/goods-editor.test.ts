// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/renderers/layers", () => ({
  Layers: { show: vi.fn(), hide: vi.fn(), has: () => false, draw: vi.fn(), isOn: () => false }
}));
vi.mock("@/ui/tooltips", () => ({ tip: vi.fn(), clearMainTip: vi.fn() }));
vi.mock("@/ui/map/viewbox-events", () => ({ applyDefaultViewboxEvents: vi.fn() }));
vi.mock("@/model/icons", () => ({ Icons: { retry: vi.fn(), href: (id: string) => `#${id}` } }));
vi.mock("@/controllers", () => ({ Controllers: {} }));

import "@/model/styles/styles";
import { Goods } from "@/model/economy/goods-generator";
import { createLocalizedName } from "@/model/localization/localized-names";
import { Csv } from "@/services/io/csv";
import { dialogState } from "@/ui/dialog/state";
import { GoodsEditor } from "./goods-editor";

const good = (i: number, name: string, tags: string[], chinese?: string) => ({
  i,
  name,
  tags,
  color: "#fff",
  icon: "",
  value: 1,
  unit: "",
  ...(chinese && { localizedNames: { zh: createLocalizedName({ text: chinese, sourceName: name }) } })
});

beforeEach(() => {
  dialogState.remove("goodsEditor", "filters");
  document.body.innerHTML = /* html */ `<div id="dialogs"></div><svg></svg>`;
  vi.stubGlobal("options", {
    app: { mode: null },
    map: {
      goods: [
        good(1, "Grain", ["food"], "谷物"),
        good(2, "Iron", ["metal"], "铁"),
        good(3, "Bread", ["food", "baked"], "面包")
      ]
    }
  });
  vi.stubGlobal("pack", {
    cells: { i: [] },
    burgs: [],
    markets: [],
    deals: []
  });
  Object.assign(Goods, {
    get: (id: number) => options.map.goods.find(g => g.i === id),
    getBiomesProduction: () => ({})
  });
});

const search = (query: string) => {
  const input = document.getElementById("goodsSearch") as HTMLInputElement;
  input.value = query;
  input.dispatchEvent(new Event("input"));
  return [...document.querySelectorAll<HTMLElement>("#goodsBody .goods")].map(line => line.dataset.id);
};

it("filters goods by name or tag", () => {
  GoodsEditor.open();
  expect(search("ir")).toEqual(["2"]);
  expect(search("谷物")).toEqual(["1"]);
  expect(search("food").toSorted()).toEqual(["1", "3"]);
  expect(search("#bak")).toEqual(["3"]);
  expect(search("").toSorted()).toEqual(["1", "2", "3"]);
});

it("shows and exports Chinese names beside unchanged source names", () => {
  GoodsEditor.open();
  expect(document.querySelector('[data-id="1"] .localizedName')?.textContent).toBe("谷物");
  expect(options.map.goods[0].name).toBe("Grain");

  const download = vi.spyOn(Csv, "download").mockImplementation(() => {});
  (document.getElementById("goodsExport") as HTMLButtonElement).click();

  const [, headers, rows] = download.mock.calls[0];
  expect(headers).toContain("Chinese Name");
  expect(headers).toContain("Original Name");
  expect(rows[0]).toContain("谷物");
  expect(rows[0]).toContain("Grain");
});
