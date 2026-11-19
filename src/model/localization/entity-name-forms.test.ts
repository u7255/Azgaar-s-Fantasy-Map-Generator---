import { describe, expect, it } from "vitest";
import { localizeFormName } from "./entity-name-forms";

describe("localizeFormName", () => {
  it.each([
    ["Kingdom", "王国"],
    ["Duchy", "公国"],
    ["Republic", "共和国"],
    ["City-state", "城邦"],
    ["Federation", "联邦"],
    ["Province", "省"]
  ])("maps %s without changing the stored key", (source, chinese) => {
    expect(localizeFormName(source)).toBe(chinese);
  });

  it("keeps unknown and custom forms visible", () => {
    expect(localizeFormName("Free March")).toBe("Free March");
    expect(localizeFormName("  ")).toBe("");
    expect(localizeFormName(undefined)).toBe("");
  });
});
