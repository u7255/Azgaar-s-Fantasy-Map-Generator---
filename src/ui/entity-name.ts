import { type EntityRef, MapEntities } from "@/model/map-entities";
import type { EditorColumn } from "@/ui/dialog/table";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/string-utils";

export const LOCALIZATION_CHANGED_EVENT = "localization:changed";

function notifyLocalizationChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOCALIZATION_CHANGED_EVENT));
}

/** A sortable Chinese-name column for overview tables without hiding the editable source name */
export function localizedNameColumn<T>({
  getRef,
  width = "10em",
  mobileHidden = true
}: {
  getRef: (row: T) => EntityRef;
  width?: string;
  mobileHidden?: boolean;
}): EditorColumn<T> {
  return {
    key: "chineseName",
    label: t("Chinese name"),
    width,
    mobileHidden,
    sortBy: row => MapEntities.getNameParts(getRef(row)).chinese,
    sortType: "alpha"
  };
}

export function renderLocalizedNameCell(ref: EntityRef): string {
  const chinese = MapEntities.getNameParts(ref).chinese;
  return `<div data-col="chineseName" data-tip="${t("Chinese name")}" class="localizedName">${escapeHtml(chinese || "—")}</div>`;
}

/** The reviewed Chinese name and the unchanged source name used by CSV exports */
export function localizedNameCsv(ref: EntityRef): [string, string] {
  const { chinese, original } = MapEntities.getNameParts(ref);
  return [chinese, original];
}

/** The active display name, with an explicit source short name for flat table and option labels */
export function currentEntityName(ref: EntityRef, sourceName?: string): string {
  const displayMode = globalThis.options?.map?.localization?.displayMode;
  if (sourceName === undefined || displayMode === "bilingual") return MapEntities.getName(ref);
  if (displayMode === "source") return sourceName;
  return MapEntities.getNameParts(ref).chinese || sourceName;
}

/** A table name cell that shows the active name and keeps the source name in its tooltip */
export function renderEntityNameCell(ref: EntityRef, sourceName?: string, dataCol = "name"): string {
  const display = currentEntityName(ref, sourceName);
  const original = MapEntities.getNameParts(ref).original;
  return `<input data-col="${dataCol}" data-tip="${escapeHtml(`${t("Original")}: ${original}`)}" class="entityNameCell name pointer" value="${escapeHtml(display)}" readonly />`;
}

/** Values for a paired Chinese display-name and source-name editor */
export function getEntityNameEditValues(ref: EntityRef): { chinese: string; source: string } {
  const { chinese, original } = MapEntities.getNameParts(ref);
  return { chinese, source: original };
}

export function setEntityChineseName(ref: EntityRef, text: string): boolean {
  const changed = MapEntities.setChineseOverride(ref, text);
  if (changed) notifyLocalizationChanged();
  return changed;
}

export function clearEntityChineseName(ref: EntityRef): boolean {
  const changed = MapEntities.clearChineseOverride(ref);
  if (changed) notifyLocalizationChanged();
  return changed;
}

export function announceLocalizationChanged(): void {
  notifyLocalizationChanged();
}
