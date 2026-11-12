import type {
  NovelGazetteerDocument,
  NovelGazetteerEntry,
  NovelGazetteerMode
} from "@/model/localization/novel-gazetteer";
import { Csv } from "@/services/io/csv";
import { getFileName } from "@/services/io/file-name";
import { downloadFile } from "@/utils/file-utils";
import { t } from "@/utils/i18n";

export const NOVEL_GAZETTEER_FORMATS = ["markdown", "csv", "json"] as const;

export type NovelGazetteerFormat = (typeof NOVEL_GAZETTEER_FORMATS)[number];

function modeLabel(mode: NovelGazetteerMode): string {
  if (mode === "source") return t("Original");
  if (mode === "bilingual") return t("Bilingual");
  return t("Chinese");
}

function csvHeader(): string[] {
  return [
    t("Type"),
    t("Chinese name"),
    t("Original"),
    t("Pinyin"),
    t("Aliases"),
    t("Country"),
    t("Province", { context: "gazetteer" }),
    t("Population"),
    t("Note summary"),
    t("Related entities")
  ];
}

function csvRow(entry: NovelGazetteerEntry): Array<string | number> {
  return [
    entry.type,
    entry.chineseName,
    entry.originalName,
    entry.pinyin,
    entry.aliases.join("; "),
    entry.country,
    entry.province,
    entry.population ?? "",
    entry.noteSummary,
    entry.relatedEntities.join("; ")
  ];
}

function markdownText(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]<>|])/g, "\\$1");
}

function markdownValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return markdownText(String(value));
}

export function formatNovelGazetteerCsv(document: NovelGazetteerDocument): string {
  return Csv.format(
    csvHeader(),
    document.entries.map(entry => csvRow(entry))
  );
}

export function formatNovelGazetteerJson(document: NovelGazetteerDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function formatNovelGazetteerMarkdown(document: NovelGazetteerDocument): string {
  const lines = [
    `# ${markdownText(document.title)} - ${t("Novel Gazetteer")}`,
    "",
    `- ${t("Export mode")}: ${modeLabel(document.mode)}`,
    `- ${t("Entries: {{count}}", { count: document.entries.length })}`,
    `- ${document.includePreview ? t("Unconfirmed previews included") : t("Unconfirmed previews excluded")}`
  ];

  let currentType = "";
  for (const entry of document.entries) {
    if (entry.type !== currentType) {
      currentType = entry.type;
      lines.push("", `## ${markdownText(currentType)}`);
    }
    lines.push(
      "",
      `### ${markdownText(entry.displayName || entry.originalName)}`,
      `- ${t("Type")}: ${markdownValue(entry.type)}`,
      `- ${t("Chinese name")}: ${markdownValue(entry.chineseName)}`,
      `- ${t("Original")}: ${markdownValue(entry.originalName)}`,
      `- ${t("Pinyin")}: ${markdownValue(entry.pinyin)}`,
      `- ${t("Aliases")}: ${markdownValue(entry.aliases.join("; "))}`,
      `- ${t("Country")}: ${markdownValue(entry.country)}`,
      `- ${t("Province", { context: "gazetteer" })}: ${markdownValue(entry.province)}`,
      `- ${t("Population")}: ${markdownValue(entry.population)}`,
      `- ${t("Note summary")}: ${markdownValue(entry.noteSummary)}`,
      `- ${t("Related entities")}: ${markdownValue(entry.relatedEntities.join("; "))}`
    );
  }

  return `${lines.join("\n")}\n`;
}

export function exportNovelGazetteer(document: NovelGazetteerDocument, format: NovelGazetteerFormat): string {
  const baseName = getFileName("Novel Gazetteer");
  if (format === "csv") {
    Csv.download(
      "Novel Gazetteer",
      csvHeader(),
      document.entries.map(entry => csvRow(entry))
    );
    return `${baseName}.csv`;
  }
  if (format === "json") {
    const fileName = `${baseName}.json`;
    downloadFile(formatNovelGazetteerJson(document), fileName, "application/json;charset=utf-8");
    return fileName;
  }
  const fileName = `${baseName}.md`;
  downloadFile(formatNovelGazetteerMarkdown(document), fileName, "text/markdown;charset=utf-8");
  return fileName;
}
