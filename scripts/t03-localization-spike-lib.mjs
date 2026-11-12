import { createHash } from "node:crypto";

export const MAP_STATE_RECORD = 14;
export const TARGET_STATE_INDEX = 1;

const NAME_FIELDS = ["name", "fullName", "formName"];
const LOCALIZATION_EXTENSION_KEYS = new Set(["localizedNames"]);
const ENTITY_RECORD_NAMES = {
  3: "biomes",
  12: "features",
  13: "cultures",
  14: "states",
  15: "burgs",
  29: "religions",
  30: "provinces",
  32: "rivers",
  35: "markers",
  37: "routes",
  38: "zones",
  47: "addedLabels"
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readRecords(mapText) {
  const records = mapText.split("\r\n");
  if (records.length < 56) throw new Error(`Unexpected .map record count: ${records.length}`);
  return records;
}

function targetState(records) {
  const states = JSON.parse(records[MAP_STATE_RECORD]);
  const state = states[TARGET_STATE_INDEX];
  if (!state?.name) throw new Error(`State ${TARGET_STATE_INDEX} is missing a name`);
  return { states, state };
}

function withoutLocalizationExtensions(value) {
  if (Array.isArray(value)) return value.map(withoutLocalizationExtensions);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !LOCALIZATION_EXTENSION_KEYS.has(key))
      .map(([key, entry]) => [key, withoutLocalizationExtensions(entry)])
  );
}

function parseJsonRecord(record) {
  try {
    return JSON.parse(record);
  } catch {
    return undefined;
  }
}

function recordLabel(recordIndex) {
  return ENTITY_RECORD_NAMES[recordIndex] ?? `record${recordIndex}`;
}

function fingerprintFields(records) {
  const names = [];
  const labels = [];
  const nameFields = { name: 0, fullName: 0, formName: 0 };
  const namesByRecord = {};
  const labelsByRecord = { addedLabels: 0 };
  const recordKinds = Object.values(ENTITY_RECORD_NAMES);

  for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
    const parsed = parseJsonRecord(records[recordIndex]);
    if (!Array.isArray(parsed)) continue;
    const kind = recordLabel(recordIndex);

    for (let entityIndex = 0; entityIndex < parsed.length; entityIndex++) {
      const entity = withoutLocalizationExtensions(parsed[entityIndex]);
      if (!entity || typeof entity !== "object") continue;

      const selected = {};
      for (const field of NAME_FIELDS) {
        if (typeof entity[field] === "string") {
          selected[field] = entity[field];
          nameFields[field]++;
        }
      }
      if (Object.keys(selected).length) {
        names.push({ record: recordIndex, kind, index: entityIndex, fields: selected });
        namesByRecord[kind] = (namesByRecord[kind] ?? 0) + 1;
      }

      if (typeof entity.label?.text === "string") {
        labels.push({ record: recordIndex, kind, index: entityIndex, text: entity.label.text });
        labelsByRecord[kind] = (labelsByRecord[kind] ?? 0) + 1;
      }
    }
  }

  return {
    names: {
      recordKinds,
      entryCount: names.length,
      fieldCounts: nameFields,
      byRecord: namesByRecord,
      hash: sha256(JSON.stringify(names))
    },
    labels: {
      recordKinds,
      entryCount: labels.length,
      byRecord: labelsByRecord,
      hash: sha256(JSON.stringify(labels))
    }
  };
}

export function injectLocalizedNames(mapText, text = "阿尔多里亚") {
  const records = readRecords(mapText);
  const { states, state } = targetState(records);
  const sourceName = state.name;
  const localized = {
    text,
    sourceName,
    sourceHash: sha256(sourceName).slice(0, 16),
    source: "manual"
  };

  state.localizedNames = { zh: localized };
  records[MAP_STATE_RECORD] = JSON.stringify(states);

  return {
    mapText: records.join("\r\n"),
    stateIndex: TARGET_STATE_INDEX,
    sourceName,
    localized
  };
}

export function summarizeMap(mapText, stateIndex = TARGET_STATE_INDEX) {
  const records = readRecords(mapText);
  const states = JSON.parse(records[MAP_STATE_RECORD]);
  const state = states[stateIndex];
  if (!state?.name) throw new Error(`State ${stateIndex} is missing a name`);

  const params = records[0].split("|");
  const settings = parseJsonRecord(records[1]);
  const fingerprints = fingerprintFields(records);
  const generatedStateFields = {
    i: state.i,
    type: state.type,
    capital: state.capital,
    center: state.center,
    culture: state.culture,
    pole: state.pole,
    urban: state.urban,
    rural: state.rural,
    area: state.area,
    cells: state.cells,
    neighbors: state.neighbors,
    color: state.color
  };

  return {
    recordCount: records.length,
    version: params[0],
    seed: params[3],
    graph: { width: params[4], height: params[5] },
    mapTitle: settings?.lore?.name ?? null,
    localizationExtensionsExcluded: [...LOCALIZATION_EXTENSION_KEYS],
    names: fingerprints.names,
    labels: fingerprints.labels,
    state: {
      index: stateIndex,
      name: state.name,
      fullName: state.fullName,
      labelText: state.label?.text
    },
    generated: {
      stateFieldsHash: sha256(JSON.stringify(generatedStateFields)),
      gridHash: sha256(records[6]),
      featuresHash: sha256(records[12]),
      culturesHash: sha256(records[13]),
      burgsHash: sha256(records[15]),
      burgCellsHash: sha256(records[17]),
      cultureCellsHash: sha256(records[19]),
      stateCellsHash: sha256(records[25])
    }
  };
}

export function readLocalizedNames(mapText, stateIndex = TARGET_STATE_INDEX) {
  const records = readRecords(mapText);
  const states = JSON.parse(records[MAP_STATE_RECORD]);
  return states[stateIndex]?.localizedNames?.zh;
}

export function localizedNamesEqual(actual, expected) {
  const normalize = name => {
    if (!name || typeof name !== "object") return name;
    return {
      text: name.text,
      pinyin: name.pinyin,
      aliases: name.aliases,
      source: name.source,
      status: name.status ?? "confirmed",
      sourceName: name.sourceName,
      sourceHash: name.sourceHash
    };
  };

  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}
