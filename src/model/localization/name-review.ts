import { type EntityRef, type EntityType, MapEntities } from "@/model/map-entities";
import { t } from "@/utils/i18n";
import { resolveChineseNameStyle } from "./chinese-name-styles";
import { setEntityChineseOverride } from "./entity-display-name";
import {
  getLocalizedNameSourceHash,
  isLocalizedNameStale,
  type LocalizedName,
  type LocalizedNameSourceFields,
  type LocalizedNameStatus,
  type LocalizedNames,
  parseLocalizedNames,
  resolveLocalizedName
} from "./localized-names";
import {
  assessChineseNameLength,
  type ChineseNameEntityType,
  type ChineseNameLengthAssessment
} from "./name-length-budget";
import { findLocalizedNameCollisions, suggestChineseName } from "./transliteration-engine";

export const REVIEW_ENTITY_TYPES = [
  "state",
  "province",
  "burg",
  "river",
  "route",
  "feature",
  "marker",
  "zone",
  "journey",
  "market",
  "regiment",
  "addedLabel",
  "culture",
  "religion",
  "biome",
  "good"
] as const satisfies readonly ChineseNameEntityType[];

export type ReviewEntityType = (typeof REVIEW_ENTITY_TYPES)[number];
export type NameReviewType = ReviewEntityType | "lore";
export type ReviewSlot = "zh" | "zhOverride" | "zhPreview";

export interface NameReviewCandidate {
  name: LocalizedName;
  slot: ReviewSlot;
  status: LocalizedNameStatus;
}

export interface NameReviewRow {
  key: string;
  ref?: EntityRef;
  type: NameReviewType;
  kind: string;
  sourceFields: LocalizedNameSourceFields & { type?: string };
  sourceLabel: string;
  originalText: string;
  currentText: string;
  candidate?: NameReviewCandidate;
  candidateText?: string;
  candidateSlot?: ReviewSlot;
  candidateStatus?: LocalizedNameStatus;
  staleSlots: ReviewSlot[];
  conflictSources: string[];
  hasLocalizedName: boolean;
  isStale: boolean;
  isConflict: boolean;
  canRegenerate: boolean;
  length: ChineseNameLengthAssessment;
  isOverlong: boolean;
}

export interface NameReviewStats {
  total: number;
  confirmed: number;
  preview: number;
  stale: number;
  conflict: number;
  missing: number;
  overlong: number;
}

export interface NameReviewBatchResult {
  changed: number;
  skipped: number;
  skippedLong: number;
}

interface ReviewEntity extends LocalizedNameSourceFields {
  i: number;
  name?: string;
  fullName?: string;
  type?: string;
  label?: { text?: string };
  localizedNames?: LocalizedNames;
}

interface ReviewSnapshot {
  ref?: EntityRef;
  type: NameReviewType;
  localizedNames: unknown;
}

interface PendingBatch {
  entries: ReviewSnapshot[];
}

const REVIEW_SLOTS: ReviewSlot[] = ["zh", "zhOverride", "zhPreview"];

function entityOf(ref: EntityRef): ReviewEntity | undefined {
  return MapEntities.get(ref) as ReviewEntity | undefined;
}

function reviewEntityOfRow(row: NameReviewRow): ReviewEntity | undefined {
  if (row.type === "lore") return options.map.lore as unknown as ReviewEntity;
  return row.ref ? entityOf(row.ref) : undefined;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function sourceFieldsOf(ref: EntityRef): LocalizedNameSourceFields & { type?: string } {
  return MapEntities.getSourceFields(ref);
}

function sourceNameFor(fields: LocalizedNameSourceFields): string | undefined {
  return clean(fields.name) || clean(fields.labelText) || clean(fields.fallbackText);
}

function suggestionSource(
  fields: LocalizedNameSourceFields & { type?: string }
): { name: string; fullName?: string; type?: string } | undefined {
  const name = clean(fields.name) || clean(fields.labelText) || clean(fields.fallbackText);
  if (!name) return undefined;
  return { name, fullName: clean(fields.fullName), type: clean(fields.type) };
}

function generationOptions(row: NameReviewRow) {
  return {
    entityType: row.type,
    style: resolveChineseNameStyle(options.map.localization.nameStyle)
  };
}

function slotName(localizedNames: LocalizedNames, slot: ReviewSlot): LocalizedName | undefined {
  return localizedNames[slot];
}

function candidateFor(
  localizedNames: LocalizedNames | undefined,
  fields: LocalizedNameSourceFields
): NameReviewCandidate | undefined {
  if (!localizedNames) return undefined;

  const order: ReviewSlot[] = ["zhOverride", "zh", "zhPreview"];
  for (const slot of order) {
    const name = slotName(localizedNames, slot);
    if (!name || isLocalizedNameStale(name, fields)) continue;
    if (slot === "zh" && name.status !== "confirmed" && name.status !== "preview") continue;
    return {
      name,
      slot,
      status: slot === "zhOverride" ? "confirmed" : slot === "zhPreview" ? "preview" : name.status
    };
  }
  return undefined;
}

function staleSlotsFor(localizedNames: LocalizedNames | undefined, fields: LocalizedNameSourceFields): ReviewSlot[] {
  if (!localizedNames) return [];
  return REVIEW_SLOTS.filter(slot => {
    const name = slotName(localizedNames, slot);
    return Boolean(name && isLocalizedNameStale(name, fields));
  });
}

function firstStoredCandidate(
  localizedNames: LocalizedNames | undefined
): { name: LocalizedName; slot: ReviewSlot } | undefined {
  if (!localizedNames) return undefined;
  for (const slot of REVIEW_SLOTS) {
    const name = localizedNames[slot];
    if (name) return { name, slot };
  }
  return undefined;
}

function buildRows(): NameReviewRow[] {
  if (typeof pack === "undefined" || !pack.cells?.i?.length) return [];

  const rows: NameReviewRow[] = [];
  for (const type of REVIEW_ENTITY_TYPES) {
    for (const target of MapEntities.collect(type as EntityType)) {
      const entity = target.entity as ReviewEntity;
      const fields = sourceFieldsOf(target.ref);
      const localizedNames = parseLocalizedNames(entity.localizedNames);
      const candidate = candidateFor(localizedNames, fields);
      const stored = firstStoredCandidate(localizedNames);
      const staleSlots = staleSlotsFor(localizedNames, fields);
      const originalText = resolveLocalizedName({ ...fields, displayMode: "source" }).text;
      const currentText = candidate?.name.text || originalText;
      const length = assessChineseNameLength(currentText, type);

      rows.push({
        key: MapEntities.key(target.ref),
        ref: target.ref,
        type,
        kind: MapEntities.getDisplay(target.ref).kind,
        sourceFields: fields,
        sourceLabel: clean(fields.name) || clean(fields.fullName) || clean(fields.labelText) || "",
        originalText,
        currentText,
        candidate,
        candidateText: stored?.name.text,
        candidateSlot: stored?.slot,
        candidateStatus: stored?.name.status,
        staleSlots,
        conflictSources: [],
        hasLocalizedName: Boolean(stored),
        isStale: staleSlots.length > 0,
        isConflict: false,
        canRegenerate: Boolean(suggestionSource(fields)),
        length,
        isOverlong: Boolean(candidate && length.overSoft)
      });
    }
  }

  const loreRow = buildLoreRow();
  if (loreRow) rows.push(loreRow);
  return markConflicts(rows);
}

function buildLoreRow(): NameReviewRow | undefined {
  const lore = options.map.lore;
  if (!lore?.name) return undefined;
  const entity = lore as unknown as ReviewEntity;
  const fields = { name: lore.name, fallbackText: lore.name, type: "lore" };
  const localizedNames = parseLocalizedNames(entity.localizedNames);
  const candidate = candidateFor(localizedNames, fields);
  const stored = firstStoredCandidate(localizedNames);
  const staleSlots = staleSlotsFor(localizedNames, fields);
  const originalText = resolveLocalizedName({ ...fields, displayMode: "source" }).text;
  const currentText = candidate?.name.text || originalText;
  const length = assessChineseNameLength(currentText, "lore");
  return {
    key: "lore:0",
    type: "lore",
    kind: t("Map"),
    sourceFields: fields,
    sourceLabel: lore.name,
    originalText,
    currentText,
    candidate,
    candidateText: stored?.name.text,
    candidateSlot: stored?.slot,
    candidateStatus: stored?.name.status,
    staleSlots,
    conflictSources: [],
    hasLocalizedName: Boolean(stored),
    isStale: staleSlots.length > 0,
    isConflict: false,
    canRegenerate: true,
    length,
    isOverlong: Boolean(candidate && length.overSoft)
  };
}

function markConflicts(rows: NameReviewRow[]): NameReviewRow[] {
  const candidates = rows.flatMap(row => (row.candidate ? [row.candidate.name] : []));
  const collisions = findLocalizedNameCollisions(candidates);
  if (!collisions.length) return rows;

  const sourcesByText = new Map(collisions.map(collision => [collision.text.trim(), collision.sourceNames]));
  return rows.map(row => {
    const sources = row.candidate ? sourcesByText.get(row.candidate.name.text.trim()) : undefined;
    return sources ? { ...row, conflictSources: sources, isConflict: true } : row;
  });
}

export function listNameReviewRows(): NameReviewRow[] {
  return buildRows();
}

export function getNameReviewStats(rows: NameReviewRow[] = buildRows()): NameReviewStats {
  return rows.reduce<NameReviewStats>(
    (stats, row) => {
      stats.total++;
      if (row.candidate?.slot === "zhOverride" || row.candidate?.status === "confirmed") stats.confirmed++;
      if (row.candidate?.status === "preview") stats.preview++;
      if (row.isStale) stats.stale++;
      if (row.isConflict) stats.conflict++;
      if (!row.hasLocalizedName) stats.missing++;
      if (row.isOverlong) stats.overlong++;
      return stats;
    },
    { total: 0, confirmed: 0, preview: 0, stale: 0, conflict: 0, missing: 0, overlong: 0 }
  );
}

export function filterNameReviewRows(rows: NameReviewRow[], filter: string): NameReviewRow[] {
  if (filter === "stale") return rows.filter(row => row.isStale);
  if (filter === "conflict") return rows.filter(row => row.isConflict);
  if (filter === "missing") return rows.filter(row => !row.hasLocalizedName);
  if (filter === "long") return rows.filter(row => row.isOverlong);
  return rows;
}

function rawLocalizedNames(entity: ReviewEntity): Record<string, unknown> {
  const value = entity.localizedNames;
  return value && typeof value === "object" && !Array.isArray(value) ? ({ ...value } as Record<string, unknown>) : {};
}

function writeLocalizedNames(entity: ReviewEntity, value: Record<string, unknown>): void {
  entity.localizedNames = value as LocalizedNames;
}

function removeLocalizedNames(entity: ReviewEntity): void {
  delete entity.localizedNames;
}

function candidateWithCurrentSource(
  candidate: LocalizedName,
  fields: LocalizedNameSourceFields,
  status: LocalizedNameStatus,
  source = candidate.source
): LocalizedName {
  const name = sourceNameFor(fields);
  return {
    ...candidate,
    status,
    source,
    sourceName: clean(fields.name),
    sourceFullName: clean(fields.fullName),
    sourceHash: getLocalizedNameSourceHash(name)
  };
}

function cloneNames(value: unknown): unknown {
  if (value === undefined) return undefined;
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export class NameReviewStore {
  private pendingBatch: PendingBatch | undefined;

  rows(): NameReviewRow[] {
    return buildRows();
  }

  stats(rows = buildRows()): NameReviewStats {
    return getNameReviewStats(rows);
  }

  canUndo(): boolean {
    return Boolean(this.pendingBatch?.entries.length);
  }

  discardPendingBatch(): void {
    this.pendingBatch = undefined;
  }

  snapshot(rows: NameReviewRow[]): void {
    const entries = rows.flatMap(row => {
      const entity = reviewEntityOfRow(row);
      return entity ? [{ ref: row.ref, type: row.type, localizedNames: cloneNames(entity.localizedNames) }] : [];
    });
    this.pendingBatch = entries.length ? { entries } : undefined;
  }

  private restorePendingBatch(): number {
    const entries = this.pendingBatch?.entries;
    this.pendingBatch = undefined;
    if (!entries?.length) return 0;

    let restored = 0;
    for (const entry of entries) {
      const entity =
        entry.type === "lore"
          ? (options.map.lore as unknown as ReviewEntity | undefined)
          : entry.ref
            ? entityOf(entry.ref)
            : undefined;
      if (!entity) continue;
      if (entry.localizedNames === undefined) removeLocalizedNames(entity);
      else entity.localizedNames = entry.localizedNames as LocalizedNames;
      restored++;
    }
    return restored;
  }

  undo(): number {
    return this.restorePendingBatch();
  }

  generateMissing(rows = buildRows()): NameReviewBatchResult {
    const targets = rows.filter(row => !row.hasLocalizedName && row.canRegenerate);
    if (!targets.length) return { changed: 0, skipped: rows.length, skippedLong: 0 };

    this.snapshot(targets);
    let changed = 0;
    for (const row of targets) {
      const entity = reviewEntityOfRow(row);
      const source = suggestionSource(row.sourceFields);
      const suggestion = source ? suggestChineseName(source, generationOptions(row)) : undefined;
      if (!entity || !suggestion) continue;
      writeLocalizedNames(entity, {
        ...rawLocalizedNames(entity),
        zhPreview: candidateWithCurrentSource(suggestion, row.sourceFields, "preview", "transliteration")
      });
      changed++;
    }
    return { changed, skipped: rows.length - changed, skippedLong: 0 };
  }

  regenerateLong(rows = buildRows()): NameReviewBatchResult {
    const targets = rows.filter(row => row.isOverlong && row.canRegenerate);
    if (!targets.length) return { changed: 0, skipped: rows.length, skippedLong: 0 };

    this.snapshot(targets);
    let changed = 0;
    for (const row of targets) {
      const entity = reviewEntityOfRow(row);
      const source = suggestionSource(row.sourceFields);
      const suggestion = source ? suggestChineseName(source, generationOptions(row)) : undefined;
      if (!entity || !suggestion) continue;
      writeLocalizedNames(entity, {
        ...rawLocalizedNames(entity),
        zhPreview: candidateWithCurrentSource(suggestion, row.sourceFields, "preview", "transliteration")
      });
      changed++;
    }
    return { changed, skipped: rows.length - changed, skippedLong: 0 };
  }

  applyPreviews(
    rows = buildRows(),
    { forceLongNames = false }: { forceLongNames?: boolean } = {}
  ): NameReviewBatchResult {
    const previews = rows.filter(row => row.candidate?.status === "preview" && !row.isConflict && !row.isStale);
    const targets = forceLongNames ? previews : previews.filter(row => !row.length.overHard);
    const skippedLong = previews.length - targets.length;
    if (!targets.length) return { changed: 0, skipped: rows.length, skippedLong };

    this.snapshot(targets);
    let changed = 0;
    for (const row of targets) {
      const entity = reviewEntityOfRow(row);
      const candidate = row.candidate;
      if (!entity || !candidate) continue;
      const raw = rawLocalizedNames(entity);
      raw.zh = candidateWithCurrentSource(candidate.name, row.sourceFields, "confirmed");
      delete raw.zhPreview;
      writeLocalizedNames(entity, raw);
      changed++;
    }
    return { changed, skipped: rows.length - changed, skippedLong };
  }

  accept(row: NameReviewRow, { forceLongNames = false }: { forceLongNames?: boolean } = {}): boolean {
    const entity = reviewEntityOfRow(row);
    const candidate = row.candidate;
    if (!entity || !candidate || candidate.status === "stale") return false;
    if (row.length.overHard && !forceLongNames) return false;

    const raw = rawLocalizedNames(entity);
    raw.zh = candidateWithCurrentSource(candidate.name, row.sourceFields, "confirmed");
    if (candidate.slot === "zhPreview") delete raw.zhPreview;
    writeLocalizedNames(entity, raw);
    this.pendingBatch = undefined;
    return true;
  }

  edit(row: NameReviewRow, text: string): boolean {
    const entity = reviewEntityOfRow(row);
    if (!entity || !setEntityChineseOverride(entity, row.sourceFields, text)) return false;
    this.pendingBatch = undefined;
    return true;
  }

  regenerate(row: NameReviewRow): boolean {
    const entity = reviewEntityOfRow(row);
    const source = suggestionSource(row.sourceFields);
    if (!entity || !source) return false;
    const suggestion = suggestChineseName(source, generationOptions(row));
    writeLocalizedNames(entity, {
      ...rawLocalizedNames(entity),
      zhPreview: candidateWithCurrentSource(suggestion, row.sourceFields, "preview", "transliteration")
    });
    this.pendingBatch = undefined;
    return true;
  }

  clear(row: NameReviewRow): boolean {
    const entity = reviewEntityOfRow(row);
    if (!entity) return false;
    const raw = rawLocalizedNames(entity);
    let removed = false;
    for (const slot of REVIEW_SLOTS) {
      if (slot in raw) {
        delete raw[slot];
        removed = true;
      }
    }
    if (removed) {
      if (Object.keys(raw).length) writeLocalizedNames(entity, raw);
      else removeLocalizedNames(entity);
    }
    this.pendingBatch = undefined;
    return removed;
  }
}

export const nameReview = new NameReviewStore();
