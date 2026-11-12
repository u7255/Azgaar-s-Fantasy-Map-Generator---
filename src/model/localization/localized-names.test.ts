import { describe, expect, it } from "vitest";
import {
  BILINGUAL_NAME_SEPARATOR,
  combineBilingualName,
  createLocalizedName,
  getLocalizedNameSourceHash,
  normalizeLocalizedNameSource,
  parseLocalizedNames,
  refreshLocalizedNames,
  resolveLocalizedName
} from "./localized-names";

const stateSource = { name: "Aymar", fullName: "Aymar Theocracy", labelText: "Aymar |Theocracy" };

describe("source identity", () => {
  it("normalizes Unicode and spacing while preserving case for T03 compatibility", () => {
    expect(normalizeLocalizedNameSource("  AYMAR \t Theocracy ")).toBe("AYMAR Theocracy");
    expect(getLocalizedNameSourceHash("  Aymar ")).toBe(getLocalizedNameSourceHash("Aymar"));
    expect(getLocalizedNameSourceHash("AYMAR")).not.toBe(getLocalizedNameSourceHash("Aymar"));
  });

  it("keeps the T03 source hash convention", () => {
    expect(getLocalizedNameSourceHash("Aymar")).toBe("1d4d21c9edc3930e");
  });
});

describe("display priority", () => {
  const base = createLocalizedName({
    text: "艾马尔",
    sourceName: "Aymar",
    sourceFullName: "Aymar Theocracy",
    source: "manual"
  });
  const preview = createLocalizedName({
    text: "艾玛预览",
    sourceName: "Aymar",
    sourceFullName: "Aymar Theocracy",
    source: "transliteration",
    status: "preview"
  });

  it("uses the five levels in order", () => {
    const localizedNames = { zh: base, zhOverride: { ...base, text: "用户名称" }, zhPreview: preview };
    expect(resolveLocalizedName({ localizedNames, ...stateSource }).tier).toBe("override");

    delete (localizedNames as { zhOverride?: unknown }).zhOverride;
    expect(resolveLocalizedName({ localizedNames, ...stateSource })).toMatchObject({
      text: "艾马尔",
      tier: "confirmed"
    });

    localizedNames.zh = { ...base, status: "stale" };
    expect(resolveLocalizedName({ localizedNames, ...stateSource })).toMatchObject({
      text: "艾玛预览",
      tier: "preview"
    });

    delete (localizedNames as { zhPreview?: unknown }).zhPreview;
    expect(resolveLocalizedName({ localizedNames, ...stateSource })).toMatchObject({
      text: "Aymar |Theocracy",
      tier: "label"
    });
    expect(resolveLocalizedName({ localizedNames, name: "Aymar", fullName: "Aymar Theocracy" })).toMatchObject({
      text: "Aymar Theocracy",
      tier: "source"
    });
  });

  it("treats a preview slot as preview even without a stored status", () => {
    const localizedNames = parseLocalizedNames({
      zhPreview: { text: "预览", sourceName: "Aymar", sourceHash: getLocalizedNameSourceHash("Aymar") }
    });
    expect(resolveLocalizedName({ localizedNames, ...stateSource })).toMatchObject({ text: "预览", tier: "preview" });
  });

  it("can exclude previews for consumers that require confirmed names", () => {
    const localizedNames = { zhPreview: preview };
    expect(resolveLocalizedName({ localizedNames, includePreview: false, ...stateSource })).toMatchObject({
      text: "Aymar |Theocracy",
      tier: "label"
    });
  });

  it("restores the original label when localization is switched off", () => {
    expect(
      resolveLocalizedName({
        displayMode: "source",
        localizedNames: { zh: base },
        ...stateSource
      })
    ).toEqual({ text: "Aymar |Theocracy", tier: "label" });
  });

  it("keeps a stable bilingual form and drops repeated halves", () => {
    const localizedNames = { zh: base };
    expect(resolveLocalizedName({ displayMode: "bilingual", localizedNames, ...stateSource })).toMatchObject({
      text: `艾马尔${BILINGUAL_NAME_SEPARATOR}Aymar |Theocracy`,
      tier: "confirmed"
    });
    expect(combineBilingualName("艾马尔", " 艾马尔 ")).toBe("艾马尔");
    expect(combineBilingualName("艾马尔", "艾马尔 - 王国")).toBe("艾马尔 - 王国");
    expect(combineBilingualName("艾马尔", "Aymar")).toBe(`艾马尔${BILINGUAL_NAME_SEPARATOR}Aymar`);
  });

  it("leaves the bilingual source untouched when no localized name is available", () => {
    expect(resolveLocalizedName({ displayMode: "bilingual", ...stateSource })).toEqual({
      text: "Aymar |Theocracy",
      tier: "label"
    });
  });

  it("defaults to Chinese and falls back cleanly without localized names", () => {
    expect(resolveLocalizedName({ localizedNames: { zh: base }, ...stateSource }).text).toBe("艾马尔");
    expect(resolveLocalizedName({ localizedNames: undefined, ...stateSource }).text).toBe("Aymar |Theocracy");
    expect(resolveLocalizedName({ localizedNames: null, name: "Aymar" }).text).toBe("Aymar");
    expect(resolveLocalizedName({ localizedNames: {}, name: "", labelText: "" })).toEqual({ text: "", tier: "empty" });
  });
});

describe("stale detection", () => {
  it("marks a name stale after its source name changes, but not when it stays the same", () => {
    const localized = createLocalizedName({
      text: "艾马尔",
      sourceName: "Aymar",
      sourceFullName: "Aymar Theocracy"
    });
    const unchanged = refreshLocalizedNames({ zh: localized }, stateSource);
    expect(unchanged?.zh?.status).toBe("confirmed");

    const changed = refreshLocalizedNames({ zh: localized }, { ...stateSource, name: "Aymarion" });
    expect(changed?.zh?.status).toBe("stale");
    expect(resolveLocalizedName({ localizedNames: changed, ...stateSource, name: "Aymarion" }).text).toBe(
      "Aymar |Theocracy"
    );
  });

  it("marks a name stale after its source full name changes", () => {
    const localized = createLocalizedName({
      text: "艾马尔",
      sourceName: "Aymar",
      sourceFullName: "Aymar Theocracy"
    });
    const changed = refreshLocalizedNames({ zh: localized }, { ...stateSource, fullName: "Aymar Republic" });
    expect(changed?.zh?.status).toBe("stale");
  });

  it("detects a rename on read even before the status field is refreshed", () => {
    const localized = createLocalizedName({ text: "艾马尔", sourceName: "Aymar" });
    expect(
      resolveLocalizedName({ localizedNames: { zh: localized }, name: "Aymarion", fullName: "Aymarion Kingdom" })
    ).toEqual({ text: "Aymarion Kingdom", tier: "source" });
  });
});

describe("old and damaged data", () => {
  it("keeps a T03-compatible zh record and fills its status", () => {
    const parsed = parseLocalizedNames({
      zh: {
        text: "阿尔多里亚",
        sourceName: "Aymar",
        sourceHash: getLocalizedNameSourceHash("Aymar"),
        source: "manual"
      }
    });
    expect(parsed?.zh).toMatchObject({ text: "阿尔多里亚", source: "manual", status: "confirmed" });
  });

  it.each([null, undefined, [], "broken", 42, { zh: "broken" }, { zh: { text: "" } }])(
    "ignores missing or malformed data %o",
    value => {
      expect(parseLocalizedNames(value)).toBeUndefined();
      expect(resolveLocalizedName({ localizedNames: value, ...stateSource }).text).toBe("Aymar |Theocracy");
    }
  );

  it("normalizes an unknown source and status without throwing", () => {
    const parsed = parseLocalizedNames({
      zh: {
        text: "旧名",
        source: "future-import",
        status: "pending",
        sourceName: "Old",
        sourceHash: getLocalizedNameSourceHash("Old")
      }
    });
    expect(parsed?.zh).toMatchObject({ source: "unknown", status: "confirmed" });
  });
});
