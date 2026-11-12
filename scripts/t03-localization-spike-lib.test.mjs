import assert from "node:assert/strict";
import test from "node:test";
import {
  injectLocalizedNames,
  localizedNamesEqual,
  MAP_STATE_RECORD,
  readLocalizedNames,
  summarizeMap,
  TARGET_STATE_INDEX
} from "./t03-localization-spike-lib.mjs";

function createMap() {
  const records = Array.from({ length: 56 }, (_, index) => `${index}`);
  records[0] = "1.157.0|test|2026-11-11|seed-t03|1024|768|123";
  records[1] = JSON.stringify({ lore: { name: "Valcaia" } });
  records[3] = JSON.stringify([{ i: 0, name: "Neutral" }, { i: 1, name: "Woodland" }]);
  records[12] = JSON.stringify([{ i: 0, name: "Feature", label: { text: "Feature label" } }]);
  records[13] = JSON.stringify([
    { i: 0, name: "Neutral" },
    { i: 1, name: "Highland", fullName: "Highland Culture", label: { text: "Highland Culture" } }
  ]);
  records[MAP_STATE_RECORD] = JSON.stringify([
    { i: 0, name: "Neutral" },
    {
      i: 1,
      name: "Aldoria",
      fullName: "Aldoria Theocracy",
      formName: "Theocracy",
      label: { text: "Aldoria |Theocracy" },
      center: 42,
      culture: 3,
      capital: 7,
      area: 100,
      cells: 12
    }
  ]);
  records[15] = JSON.stringify([0, { i: 1, name: "Aldoria", label: { text: "Aldoria" } }]);
  records[29] = JSON.stringify([{ i: 0, name: "No religion" }, { i: 1, name: "Old Faith" }]);
  records[30] = JSON.stringify([
    { i: 1, name: "Aldoria", formName: "March", fullName: "March of Aldoria", label: { text: "Aldoria March" } }
  ]);
  records[32] = JSON.stringify([{ i: 1, name: "Silver River", label: { text: "Silver River" } }]);
  records[35] = JSON.stringify([{ i: 1, name: "North Gate" }]);
  records[37] = JSON.stringify([{ i: 1, name: "King's Road", label: { text: "King's Road" } }]);
  records[38] = JSON.stringify([{ i: 1, name: "Border Zone", label: { text: "Border Zone" } }]);
  records[47] = JSON.stringify([{ i: 1, label: { text: "Added label" } }]);
  return records.join("\r\n");
}

test("adds localizedNames.zh without changing the entity's source fields", () => {
  const original = createMap();
  const result = injectLocalizedNames(original);
  const originalState = JSON.parse(original.split("\r\n")[MAP_STATE_RECORD])[TARGET_STATE_INDEX];
  const localizedState = JSON.parse(result.mapText.split("\r\n")[MAP_STATE_RECORD])[TARGET_STATE_INDEX];

  assert.deepEqual({ ...localizedState, localizedNames: undefined }, { ...originalState, localizedNames: undefined });
  assert.equal(localizedState.name, "Aldoria");
  assert.equal(localizedState.fullName, "Aldoria Theocracy");
  assert.equal(localizedState.label.text, "Aldoria |Theocracy");
  assert.equal(localizedState.localizedNames.zh.text, "阿尔多里亚");
  assert.equal(localizedState.localizedNames.zh.sourceName, "Aldoria");
  assert.equal(localizedState.localizedNames.zh.source, "manual");
});

test("keeps map title, all entity names, all labels, records and generated data unchanged", () => {
  const original = createMap();
  const result = injectLocalizedNames(original);
  const before = summarizeMap(original);
  const after = summarizeMap(result.mapText);

  assert.equal(result.mapText.split("\r\n").length, original.split("\r\n").length);
  assert.equal(before.mapTitle, "Valcaia");
  assert.equal(after.mapTitle, "Valcaia");
  assert.deepEqual(after.names, before.names);
  assert.deepEqual(after.labels, before.labels);
  assert.deepEqual(after.generated, before.generated);
  assert.equal(after.names.byRecord.states, 2);
  assert.equal(after.names.byRecord.burgs, 1);
  assert.equal(after.names.byRecord.rivers, 1);
  assert.equal(after.names.byRecord.features, 1);
  assert.equal(after.labels.byRecord.addedLabels, 1);
  assert.ok(localizedNamesEqual(readLocalizedNames(result.mapText), result.localized));
});

test("legacy localized names compare equal after the confirmed-status migration", () => {
  const legacy = {
    text: "阿尔多里亚",
    sourceName: "Aldoria",
    sourceHash: "abc123",
    source: "manual"
  };
  const migrated = {
    status: "confirmed",
    source: "manual",
    sourceHash: "abc123",
    sourceName: "Aldoria",
    text: "阿尔多里亚"
  };

  assert.ok(localizedNamesEqual(migrated, legacy));
});

test("name, label and title fingerprints react to real source changes", () => {
  const original = createMap();
  const before = summarizeMap(original);
  const records = original.split("\r\n");

  const states = JSON.parse(records[MAP_STATE_RECORD]);
  states[TARGET_STATE_INDEX].name = "Renamed";
  records[MAP_STATE_RECORD] = JSON.stringify(states);
  const renamed = summarizeMap(records.join("\r\n"));
  assert.notEqual(renamed.names.hash, before.names.hash);

  records[MAP_STATE_RECORD] = JSON.stringify(JSON.parse(createMap().split("\r\n")[MAP_STATE_RECORD]));
  const addedLabels = JSON.parse(records[47]);
  addedLabels[0].label.text = "Changed added label";
  records[47] = JSON.stringify(addedLabels);
  const relabeled = summarizeMap(records.join("\r\n"));
  assert.notEqual(relabeled.labels.hash, before.labels.hash);

  const settings = JSON.parse(records[1]);
  settings.lore.name = "Renamed map";
  records[1] = JSON.stringify(settings);
  const retitled = summarizeMap(records.join("\r\n"));
  assert.notEqual(retitled.mapTitle, before.mapTitle);
});
