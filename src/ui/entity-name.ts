import { type EntityRef, MapEntities } from "@/model/map-entities";
import type { EditorColumn } from "@/ui/dialog/table";
import { t } from "@/utils/i18n";
import { escapeHtml } from "@/utils/string-utils";

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
