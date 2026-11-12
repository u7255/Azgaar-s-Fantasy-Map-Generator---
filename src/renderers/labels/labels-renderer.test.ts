import { describe, expect, it } from "vitest";
import { chooseNonOverlappingLabels } from "./labels-renderer";

const label = (
  id: string,
  type: "state" | "province" | "burg",
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  text = id
) => ({
  id,
  type,
  text,
  x1,
  y1,
  x2,
  y2
});

describe("chooseNonOverlappingLabels", () => {
  it("keeps states over colliding burg labels", () => {
    const chosen = chooseNonOverlappingLabels([
      label("burg", "burg", 10, 10, 30, 20),
      label("state", "state", 0, 0, 100, 40)
    ]);

    expect(chosen.map(item => item.id)).toEqual(["state"]);
  });

  it("keeps labels that only touch at the configured gap", () => {
    const chosen = chooseNonOverlappingLabels([
      label("left", "state", 0, 0, 10, 10, "same"),
      label("right", "state", 11, 0, 21, 10, "same")
    ]);

    expect(chosen.map(item => item.id)).toEqual(["left", "right"]);
  });

  it("is deterministic when two labels have the same priority", () => {
    const chosen = chooseNonOverlappingLabels([label("z", "state", 0, 0, 20, 20), label("a", "state", 0, 0, 20, 20)]);

    expect(chosen.map(item => item.id)).toEqual(["a"]);
  });

  it("keeps a longer same-type label visible", () => {
    const chosen = chooseNonOverlappingLabels([
      label("short", "state", 0, 0, 20, 20, "西部"),
      label("long", "state", 0, 0, 40, 20, "神圣阿尔多里亚联合王国")
    ]);

    expect(chosen.map(item => item.id)).toEqual(["long"]);
  });

  it("keeps a CJK same-type label over a longer Latin label", () => {
    const chosen = chooseNonOverlappingLabels([
      label("latin", "state", 0, 0, 60, 20, "Principality of Coduromia"),
      label("cjk", "state", 0, 0, 40, 20, "神圣阿尔多里亚联合王国")
    ]);

    expect(chosen.map(item => item.id)).toEqual(["cjk"]);
  });
});
