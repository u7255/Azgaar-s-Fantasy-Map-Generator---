import {
  type LocalizedNameSourceFields,
  type LocalizedNames,
  refreshLocalizedNames,
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

/** Resolve every entity through the same display rules and persist any newly detected stale state */
export function resolveEntityDisplayName(
  entity: LocalizedNameCarrier,
  source: LocalizedNameSourceFields
): ReturnType<typeof resolveLocalizedName> {
  const localizedNames = refreshLocalizedNames(entity.localizedNames, source);
  if (localizedNames && localizedNames !== entity.localizedNames) entity.localizedNames = localizedNames;

  return resolveLocalizedName({
    displayMode: globalThis.options?.map?.localization?.displayMode,
    localizedNames: localizedNames ?? entity.localizedNames,
    ...source
  });
}

/** A reviewed Chinese name when there is one, the original source name, and the current display form */
export function resolveEntityNameParts(
  entity: LocalizedNameCarrier,
  source: LocalizedNameSourceFields
): EntityNameParts {
  const current = resolveEntityDisplayName(entity, source);
  const original = resolveLocalizedName({ displayMode: "source", ...source }).text;
  const chineseResolution = resolveLocalizedName({ displayMode: "zh", localizedNames: entity.localizedNames, ...source });
  const hasChineseName = ["override", "confirmed", "preview"].includes(chineseResolution.tier);
  return {
    current: current.text,
    chinese: hasChineseName ? chineseResolution.text : "",
    original
  };
}

/** Resolve a map/Lore title through the same name layer without treating the description as a name */
export function resolveLoreDisplayName(lore: { name: string; localizedNames?: LocalizedNames }): string {
  return resolveEntityDisplayName(lore, { name: lore.name, fallbackText: lore.name }).text;
}
