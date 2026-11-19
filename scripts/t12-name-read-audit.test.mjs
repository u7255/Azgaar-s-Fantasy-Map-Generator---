import assert from "node:assert/strict";
import test from "node:test";
import { AUDIT_CATEGORIES, auditNameReads } from "./t12-name-read-audit.mjs";

const report = auditNameReads();
const entriesAt = path => report.entries.filter(entry => entry.path === path);

test("classifies every direct name read in src and electron", () => {
  assert.ok(report.total > 0);
  assert.equal(
    report.total,
    Object.values(report.counts).reduce((sum, count) => sum + count, 0)
  );
  for (const entry of report.entries) {
    assert.ok(AUDIT_CATEGORIES[entry.category], `${entry.path}:${entry.line} has no known category`);
    assert.ok(entry.reason, `${entry.path}:${entry.line} has no classification reason`);
    assert.ok(entry.property.startsWith(".label") || entry.property === ".name" || entry.property === ".fullName");
  }
});

test("keeps the central display boundary classified as integrated", () => {
  assert.ok(entriesAt("src/model/map-entities.ts").length > 0);
  assert.ok(entriesAt("src/model/localization/entity-display-name.ts").length > 0);
  assert.ok(entriesAt("src/model/localization/localized-names.ts").length > 0);
  for (const path of [
    "src/model/map-entities.ts",
    "src/model/localization/entity-display-name.ts",
    "src/model/localization/localized-names.ts"
  ]) {
    assert.ok(entriesAt(path).every(entry => entry.category === "integrated"), path);
  }
});

test("records remaining user-visible direct reads as follow-up work", () => {
  for (const path of [
    "src/controllers/cell-info.ts",
    "src/controllers/economy/entities/economy-overview.ts",
    "src/controllers/political/diplomacy-overview.ts",
    "src/controllers/political/military/military-overview.ts",
    "src/ui/dialog/limitation-picker.ts"
  ]) {
    assert.ok(
      entriesAt(path).some(entry => entry.category === "followUp"),
      `${path} must keep an explicit follow-up classification`
    );
  }
});
test("keeps UI files with unified name helpers classified as integrated", () => {
  for (const path of [
    "src/controllers/physical/rivers/rivers-overview.ts",
    "src/controllers/political/burgs/burgs-overview.ts",
    "src/controllers/political/states-editor.ts",
    "src/ui/map/map-tooltip.ts",
    "src/renderers/labels/label-data.ts"
  ]) {
    assert.ok(
      entriesAt(path).some(entry => entry.category === "integrated"),
      `${path} must keep an integrated read entry`
    );
  }
});
