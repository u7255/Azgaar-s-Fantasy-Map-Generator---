import {
  createLocalizedName,
  type LocalizedNameSourceFields,
  type LocalizedNames,
  type LocalizedNameTier,
  refreshEntityLocalizedNames,
  resolveLocalizedName
} from "./localized-names";

interface LocalizedNameCarrier {
  localizedNames?: LocalizedNames;
}

export interface EntityNameParts {
  current: string;
  chinese: string;
  original: string;
}

export interface EntityNameState {
  display: string;
  chinese: string;
  original: string;
  tier: LocalizedNameTier;
  hasChinese: boolean;
  sourceFields: LocalizedNameSourceFields;
}

const CHINESE_TIERS = new Set<LocalizedNameTier>(["override", "confirmed", "preview"]);

function cleanSourceText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function primarySourceName(source: LocalizedNameSourceFields): string | undefined {
  return cleanSourceText(source.name) ?? cleanSourceText(source.labelText) ?? cleanSourceText(source.fallbackText);
}

function rawLocalizedNames(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...value } as Record<string, unknown>;
}

/** Resolve every entity through the same display rules and persist any newly detected stale state */
export function resolveEntityDisplayName(
  entity: LocalizedNameCarrier,
  source: LocalizedNameSourceFields
): ReturnType<typeof resolveLocalizedName> {
  const localizedNames = refreshEntityLocalizedNames(entity, source) ?? entity.localizedNames;

  return resolveLocalizedName({
    displayMode: globalThis.options?.map?.localization?.displayMode,
    localizedNames,
    ...source
  });
}

/** One neutral read boundary for display, Chinese and original names */
export function resolveEntityNameState(
  entity: LocalizedNameCarrier,
  source: LocalizedNameSourceFields
): EntityNameState {
  const display = resolveEntityDisplayName(entity, source);
  const original = resolveLocalizedName({ displayMode: "source", ...source }).text;
  const chinese = resolveLocalizedName({ displayMode: "zh", localizedNames: entity.localizedNames, ...source });
  const hasChinese = CHINESE_TIERS.has(chinese.tier);
  return {
    display: display.text,
    chinese: hasChinese ? chinese.text : "",
    original,
    tier: display.tier,
    hasChinese,
    sourceFields: source
  };
}

/** Write a user-reviewed Chinese name without touching any source field */
export function setEntityChineseOverride(
  entity: LocalizedNameCarrier,
  source: LocalizedNameSourceFields,
  text: string
): boolean {
  const value = text.trim();
  const sourceName = primarySourceName(source);
  if (!value || !sourceName) return false;

  entity.localizedNames = {
    ...rawLocalizedNames(entity.localizedNames),
    zhOverride: createLocalizedName({
      text: value,
      sourceName,
      sourceFullName: cleanSourceText(source.fullName),
      source: "user",
      status: "confirmed"
    })
  };
  return true;
}

/** Remove only the user's Chinese override and preserve every other stored field */
export function clearEntityChineseOverride(entity: LocalizedNameCarrier): boolean {
  const raw = rawLocalizedNames(entity.localizedNames);
  if (raw.zhOverride === undefined) return false;

  delete raw.zhOverride;
  if (Object.keys(raw).length) entity.localizedNames = raw as LocalizedNames;
  else delete entity.localizedNames;
  return true;
}

/** Resolve a map/Lore title through the same name layer without treating the description as a name */
export function resolveLoreDisplayName(lore: { name: string; localizedNames?: LocalizedNames }): string {
  return resolveEntityDisplayName(lore, { name: lore.name, fallbackText: lore.name }).text;
}
