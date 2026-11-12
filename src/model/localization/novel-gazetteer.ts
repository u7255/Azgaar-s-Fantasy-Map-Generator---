import {
  combineBilingualName,
  type LocalizedName,
  type LocalizedNameDisplayMode,
  resolveLocalizedName
} from "@/model/localization/localized-names";
import { ENTITY_TYPES, type EntityRef, type EntityType, MapEntities } from "@/model/map-entities";
import { getPeople } from "@/model/units";
import { pinyin } from "pinyin-pro";

export const NOVEL_GAZETTEER_MODES = [
  "zh",
  "bilingual",
  "source"
] as const satisfies readonly LocalizedNameDisplayMode[];

export type NovelGazetteerMode = (typeof NOVEL_GAZETTEER_MODES)[number];

export interface NovelGazetteerEntry {
  typeKey: EntityType;
  type: string;
  chineseName: string;
  originalName: string;
  displayName: string;
  pinyin: string;
  aliases: string[];
  country: string;
  province: string;
  population: number | null;
  noteSummary: string;
  relatedEntities: string[];
}

export interface NovelGazetteerDocument {
  title: string;
  originalTitle: string;
  mode: NovelGazetteerMode;
  includePreview: boolean;
  entries: NovelGazetteerEntry[];
}

type Entity = Record<string, unknown> & {
  i: number;
  name?: string;
  fullName?: string;
  localizedNames?: unknown;
  note?: string;
};

type ResolvedName = {
  display: string;
  original: string;
  candidate?: LocalizedName;
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function entityOf(ref: EntityRef): Entity | undefined {
  return MapEntities.get(ref) as Entity | undefined;
}

function refOf(type: EntityType, id: unknown): EntityRef | undefined {
  const value = finiteNumber(id);
  return value === undefined || value <= 0 ? undefined : { type, id: value };
}

function idsOf(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(id => finiteNumber(id) ?? []);
  const id = finiteNumber(value);
  return id === undefined ? [] : [id];
}

/** Plain text for display only; the entity's note itself is never changed */
export function summarizeGazetteerNote(note: unknown, limit = 180): string {
  const text = nonEmpty(note);
  if (!text) return "";

  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
  const characters = Array.from(plain);
  if (characters.length <= limit) return plain;
  return `${characters
    .slice(0, Math.max(0, limit - 3))
    .join("")
    .trimEnd()}...`;
}

function relatedRefs(type: EntityType, value: unknown): EntityRef[] {
  return idsOf(value).flatMap(id => refOf(type, id) ?? []);
}

function typeLabelFor(typeKey: EntityType, kind: string, mode: NovelGazetteerMode): string {
  if (mode === "source") return typeKey;
  if (mode === "bilingual") return combineBilingualName(kind, typeKey);
  return kind;
}

function pinyinFor(candidate: LocalizedName | undefined): string {
  const stored = nonEmpty(candidate?.pinyin);
  if (stored) return stored;

  const chineseName = nonEmpty(candidate?.text);
  if (!/\p{Script=Han}/u.test(chineseName)) return "";
  return pinyin(chineseName, { toneType: "symbol", nonZh: "removed" }).trim();
}

function areaPopulation(assignment: ArrayLike<number> | undefined, id: number): number | null {
  if (!assignment || !pack.cells?.i?.length) return null;
  let rural = 0;
  const burgIds = new Set<number>();
  for (const cell of pack.cells.i) {
    if (assignment[cell] !== id) continue;
    rural += pack.cells.pop?.[cell] ?? 0;
    const burgId = pack.cells.burg?.[cell] ?? 0;
    if (burgId) burgIds.add(burgId);
  }
  const urban = Array.from(burgIds).reduce((sum, burgId) => sum + (pack.burgs?.[burgId]?.population ?? 0), 0);
  return getPeople(rural, urban);
}

function zonePopulation(entity: Entity): number | null {
  const cells = Array.isArray(entity.cells) ? entity.cells.flatMap(cell => finiteNumber(cell) ?? []) : [];
  if (!cells.length) return null;
  let rural = 0;
  const burgIds = new Set<number>();
  for (const cell of cells) {
    rural += pack.cells.pop?.[cell] ?? 0;
    const burgId = pack.cells.burg?.[cell] ?? 0;
    if (burgId) burgIds.add(burgId);
  }
  const urban = Array.from(burgIds).reduce((sum, burgId) => sum + (pack.burgs?.[burgId]?.population ?? 0), 0);
  return getPeople(rural, urban);
}

function populationOf(ref: EntityRef, entity: Entity): number | null {
  const rural = finiteNumber(entity.rural);
  const urban = finiteNumber(entity.urban);

  if (ref.type === "state")
    return rural !== undefined || urban !== undefined
      ? getPeople(rural, urban)
      : areaPopulation(pack.cells?.state, ref.id);
  if (ref.type === "province")
    return rural !== undefined || urban !== undefined
      ? getPeople(rural, urban)
      : areaPopulation(pack.cells?.province, ref.id);
  if (ref.type === "culture")
    return rural !== undefined || urban !== undefined
      ? getPeople(rural, urban)
      : areaPopulation(pack.cells?.culture, ref.id);
  if (ref.type === "religion")
    return rural !== undefined || urban !== undefined
      ? getPeople(rural, urban)
      : areaPopulation(pack.cells?.religion, ref.id);
  if (ref.type === "zone") return zonePopulation(entity);
  if (ref.type === "burg") return getPeople(0, finiteNumber(entity.population));
  if (ref.type === "market") {
    const center = refOf("burg", entity.centerBurgId);
    const burg = center ? entityOf(center) : undefined;
    return burg ? getPeople(0, finiteNumber(burg.population)) : null;
  }
  return null;
}

function countryRef(ref: EntityRef, entity: Entity): EntityRef | undefined {
  if (ref.type === "state") return ref;
  if (ref.type === "province" || ref.type === "burg" || ref.type === "regiment") return refOf("state", entity.state);
  if (ref.type === "market") {
    const center = refOf("burg", entity.centerBurgId);
    return center ? refOf("state", entityOf(center)?.state) : undefined;
  }
  return undefined;
}

function provinceRef(ref: EntityRef, entity: Entity): EntityRef | undefined {
  if (ref.type === "province") return ref;
  if (ref.type === "burg") return refOf("province", pack.cells?.province?.[finiteNumber(entity.cell) ?? -1]);
  if (ref.type === "market") {
    const centerRef = refOf("burg", entity.centerBurgId);
    const center = centerRef ? entityOf(centerRef) : undefined;
    return centerRef ? provinceRef(centerRef, center ?? { i: centerRef.id }) : undefined;
  }
  return undefined;
}

function routeEndpointRefs(entity: Entity): EntityRef[] {
  const points = Array.isArray(entity.points) ? entity.points : [];
  return points.flatMap(point => {
    if (!Array.isArray(point)) return [];
    const cell = finiteNumber(point[2]);
    const burgId = cell === undefined ? undefined : pack.cells?.burg?.[cell];
    return refOf("burg", burgId) ?? [];
  });
}

export function buildNovelGazetteer({
  mode = "zh",
  includePreview = false
}: {
  mode?: NovelGazetteerMode;
  includePreview?: boolean;
} = {}): NovelGazetteerDocument {
  const lore = options.map.lore;
  const originalTitle = resolveLocalizedName({ displayMode: "source", name: lore.name, fallbackText: lore.name }).text;
  const titleResolution = resolveLocalizedName({
    displayMode: mode,
    includePreview,
    localizedNames: lore.localizedNames,
    name: lore.name,
    fallbackText: lore.name
  });
  const nameCache = new Map<string, ResolvedName>();

  const resolveRef = (ref: EntityRef): ResolvedName => {
    const cacheKey = `${MapEntities.key(ref)}|${mode}|${includePreview}`;
    const cached = nameCache.get(cacheKey);
    if (cached) return cached;

    const entity = entityOf(ref);
    if (!entity) return { display: "", original: "" };
    const fields = MapEntities.getSourceFields(ref);
    const original = resolveLocalizedName({ displayMode: "source", ...fields }).text;
    let selected = resolveLocalizedName({
      displayMode: "zh",
      includePreview,
      localizedNames: entity.localizedNames,
      ...fields
    });

    if (!selected.localizedName && ref.type === "market" && !nonEmpty(entity.name)) {
      const center = refOf("burg", entity.centerBurgId);
      const centerEntity = center ? entityOf(center) : undefined;
      if (center && centerEntity) {
        selected = resolveLocalizedName({
          displayMode: "zh",
          includePreview,
          localizedNames: centerEntity.localizedNames,
          ...MapEntities.getSourceFields(center)
        });
      }
    }

    const candidate = selected.localizedName;
    const display =
      mode === "source"
        ? original
        : mode === "bilingual"
          ? candidate
            ? combineBilingualName(candidate.text, original)
            : original
          : candidate?.text || original;
    const resolved = { display, original, candidate };
    nameCache.set(cacheKey, resolved);
    return resolved;
  };

  const displayRef = (ref: EntityRef | undefined): string => (ref ? resolveRef(ref).display : "");

  const entries: NovelGazetteerEntry[] = [];
  const collections = new Map(MapEntities.collections().map(collection => [collection.type, collection]));
  for (const typeKey of ENTITY_TYPES) {
    const collection = collections.get(typeKey);
    const targets = MapEntities.collect(typeKey).toSorted(
      (a, b) => a.ref.id - b.ref.id || (a.ref.sub ?? 0) - (b.ref.sub ?? 0)
    );
    for (const { ref, entity: rawEntity } of targets) {
      const entity = rawEntity as Entity;
      const resolved = resolveRef(ref);
      if (!resolved.original && !resolved.display && !resolved.candidate) continue;
      const kind = MapEntities.getDisplay(ref).kind;
      const related = new Set<string>();
      const addRelated = (target: EntityRef | undefined) => {
        if (!target || MapEntities.key(target) === MapEntities.key(ref)) return;
        const name = displayRef(target);
        if (name) related.add(name);
      };

      for (const [field, type] of Object.entries(collection?.references ?? {})) {
        for (const target of relatedRefs(type, entity[field])) addRelated(target);
      }

      if (typeKey === "state") {
        for (const neighbor of relatedRefs("state", entity.neighbors)) addRelated(neighbor);
      } else if (typeKey === "burg") {
        addRelated(provinceRef(ref, entity));
      } else if (typeKey === "route") {
        for (const endpoint of routeEndpointRefs(entity)) addRelated(endpoint);
      } else if (typeKey === "regiment") {
        addRelated(refOf("state", entity.state));
      }

      entries.push({
        typeKey,
        type: typeLabelFor(typeKey, kind, mode),
        chineseName: resolved.candidate?.text ?? "",
        originalName: resolved.original,
        displayName: resolved.display,
        pinyin: pinyinFor(resolved.candidate),
        aliases: resolved.candidate?.aliases ?? [],
        country: displayRef(countryRef(ref, entity)),
        province: displayRef(provinceRef(ref, entity)),
        population: populationOf(ref, entity),
        noteSummary: summarizeGazetteerNote(entity.note),
        relatedEntities: Array.from(related)
      });
    }
  }

  return {
    title: titleResolution.text,
    originalTitle,
    mode,
    includePreview,
    entries
  };
}
