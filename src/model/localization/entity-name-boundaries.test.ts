// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MapEntities } from "@/model/map-entities";
import { States } from "@/model/political/states-generator";
import { createLocalizedName, type LocalizedNames } from "./localized-names";

const stateRef = { type: "state", id: 1 } as const;

function state() {
  return pack.states[1];
}

beforeEach(() => {
  globalThis.options = {
    map: {
      goods: [],
      localization: { displayMode: "zh", mapFont: "song-ke" }
    }
  } as unknown as typeof options;
  globalThis.pack = {
    states: [
      { i: 0 },
      {
        i: 1,
        name: "Ardenia",
        fullName: "Kingdom of Ardenia",
        form: "Monarchy",
        formName: "Kingdom"
      }
    ],
    cells: { i: [0], p: [[0, 0]] }
  } as unknown as typeof pack;
});

describe("T12-A entity name boundaries", () => {
  it("writes zhOverride without touching source fields or unknown metadata", () => {
    const record = state();
    record.localizedNames = {
      future: { keep: true },
      zh: {
        ...createLocalizedName({ text: "阿登尼亚", sourceName: "Ardenia", sourceFullName: "Kingdom of Ardenia" }),
        futureLabel: "keep"
      }
    } as LocalizedNames;
    const sourceBefore = JSON.stringify({ name: record.name, fullName: record.fullName, form: record.form });

    expect(MapEntities.setChineseOverride(stateRef, " 新阿登 ")).toBe(true);

    expect(JSON.stringify({ name: record.name, fullName: record.fullName, form: record.form })).toBe(sourceBefore);
    expect(record.localizedNames?.zhOverride).toMatchObject({
      text: "新阿登",
      source: "user",
      status: "confirmed",
      sourceName: "Ardenia",
      sourceFullName: "Kingdom of Ardenia"
    });
    expect((record.localizedNames as unknown as Record<string, unknown>).future).toEqual({ keep: true });

    const nameState = MapEntities.getNameState(stateRef);
    expect(nameState).toMatchObject({
      display: "新阿登",
      chinese: "新阿登",
      original: "Kingdom of Ardenia",
      tier: "override",
      hasChinese: true
    });
    expect(((record.localizedNames?.zh ?? {}) as unknown as Record<string, unknown>).futureLabel).toBe("keep");
  });

  it("marks an old Chinese override stale when the owner renames the source", () => {
    expect(MapEntities.setChineseOverride(stateRef, "阿登尼亚")).toBe(true);
    const overrideText = state().localizedNames?.zhOverride?.text;

    States.rename(1, "Nova");

    expect(state().name).toBe("Nova");
    expect(state().localizedNames?.zhOverride).toMatchObject({
      text: overrideText,
      source: "user",
      status: "stale"
    });
    expect(MapEntities.getNameState(stateRef)).toMatchObject({
      display: "Kingdom of Nova",
      chinese: "",
      tier: "source",
      hasChinese: false
    });
  });

  it("clears only the override and falls back to the confirmed Chinese name", () => {
    const record = state();
    record.localizedNames = {
      future: { keep: true },
      zh: createLocalizedName({ text: "阿登尼亚", sourceName: "Ardenia", sourceFullName: "Kingdom of Ardenia" }),
      zhPreview: createLocalizedName({
        text: "阿登",
        sourceName: "Ardenia",
        sourceFullName: "Kingdom of Ardenia",
        status: "preview"
      })
    } as unknown as LocalizedNames;
    expect(MapEntities.setChineseOverride(stateRef, "新阿登")).toBe(true);

    expect(MapEntities.clearChineseOverride(stateRef)).toBe(true);

    expect(record.localizedNames?.zhOverride).toBeUndefined();
    expect(record.localizedNames?.zh?.text).toBe("阿登尼亚");
    expect(record.localizedNames?.zhPreview?.text).toBe("阿登");
    expect((record.localizedNames as unknown as Record<string, unknown>).future).toEqual({ keep: true });
    expect(MapEntities.getNameState(stateRef)).toMatchObject({
      display: "阿登尼亚",
      chinese: "阿登尼亚",
      tier: "confirmed"
    });
    expect(MapEntities.clearChineseOverride(stateRef)).toBe(false);
  });

  it("removes an otherwise empty extension when only the override existed", () => {
    expect(MapEntities.setChineseOverride(stateRef, "阿登尼亚")).toBe(true);

    expect(MapEntities.clearChineseOverride(stateRef)).toBe(true);

    expect(state().localizedNames).toBeUndefined();
    expect(MapEntities.getNameState(stateRef)).toMatchObject({
      display: "Kingdom of Ardenia",
      chinese: "",
      tier: "source"
    });
  });
});
