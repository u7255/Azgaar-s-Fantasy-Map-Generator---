import songKeUrl from "@/assets/fonts/chinese/song-ke.woff2?url";
import titleSongUrl from "@/assets/fonts/chinese/title-song.woff2?url";
import wenKaiUrl from "@/assets/fonts/chinese/wen-kai.woff2?url";
import xingShuUrl from "@/assets/fonts/chinese/xing-shu.woff2?url";

export const CHINESE_MAP_FONT_IDS = ["song-ke", "title-song", "wen-kai", "xing-shu"] as const;

export type ChineseMapFontId = (typeof CHINESE_MAP_FONT_IDS)[number];

export interface ChineseMapFontDefinition {
  id: ChineseMapFontId;
  label: string;
  family: string;
  fallbackFamilies: readonly string[];
  genericFamily: "serif" | "cursive";
  src: string;
  sourcePackage: string;
  sourceVersion: string;
  sourceFile: string;
  licenseFile: string;
  weight: string;
}

/**
 * Limit the embedded face to CJK code points. Latin letters and digits then keep the user's
 * original style font instead of silently changing typography in Chinese mode.
 */
export const CHINESE_FONT_UNICODE_RANGE = [
  "U+2E80-2EFF",
  "U+3000-303F",
  "U+3040-30FF",
  "U+31C0-31EF",
  "U+3400-4DBF",
  "U+4E00-9FFF",
  "U+F900-FAFF",
  "U+FE10-FE1F",
  "U+FE30-FE4F",
  "U+FF01-FF60",
  "U+FFE0-FFE6",
  "U+20000-2FA1F"
].join(",");

export const DEFAULT_CHINESE_MAP_FONT: ChineseMapFontId = "song-ke";

export const CHINESE_MAP_FONTS: readonly ChineseMapFontDefinition[] = [
  {
    id: "song-ke",
    label: "Song Seal",
    family: "Noto Serif SC",
    fallbackFamilies: ["Source Han Serif SC", "Songti SC", "STSong", "SimSun"],
    genericFamily: "serif",
    src: songKeUrl,
    sourcePackage: "@fontsource/noto-serif-sc",
    sourceVersion: "5.3.1",
    sourceFile: "noto-serif-sc-chinese-simplified-400-normal.woff2",
    licenseFile: "public/fonts/licenses/noto-serif-sc-OFL.txt",
    weight: "400"
  },
  {
    id: "title-song",
    label: "Display Song",
    family: "ZCOOL XiaoWei",
    fallbackFamilies: ["Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun"],
    genericFamily: "serif",
    src: titleSongUrl,
    sourcePackage: "@fontsource/zcool-xiaowei",
    sourceVersion: "5.3.0",
    sourceFile: "zcool-xiaowei-chinese-simplified-400-normal.woff2",
    licenseFile: "public/fonts/licenses/zcool-xiaowei-OFL.txt",
    weight: "400"
  },
  {
    id: "wen-kai",
    label: "Literary Kai",
    family: "LXGW WenKai",
    fallbackFamilies: ["LXGW WenKai Lite", "Kaiti SC", "STKaiti", "KaiTi"],
    genericFamily: "serif",
    src: wenKaiUrl,
    sourcePackage: "@fontsource/lxgw-wenkai",
    sourceVersion: "5.3.0",
    sourceFile: "lxgw-wenkai-latin-500-normal.woff2",
    licenseFile: "public/fonts/licenses/lxgw-wenkai-OFL.txt",
    weight: "500"
  },
  {
    id: "xing-shu",
    label: "Running Script",
    family: "Ma Shan Zheng",
    fallbackFamilies: ["STXingkai", "Xingkai SC", "Kaiti SC", "STKaiti", "KaiTi"],
    genericFamily: "cursive",
    src: xingShuUrl,
    sourcePackage: "@fontsource/ma-shan-zheng",
    sourceVersion: "5.3.1",
    sourceFile: "ma-shan-zheng-chinese-simplified-400-normal.woff2",
    licenseFile: "public/fonts/licenses/ma-shan-zheng-OFL.txt",
    weight: "400"
  }
];

const byId = new Map(CHINESE_MAP_FONTS.map(font => [font.id, font]));

export function isChineseMapFontId(value: unknown): value is ChineseMapFontId {
  return typeof value === "string" && (CHINESE_MAP_FONT_IDS as readonly string[]).includes(value);
}

export function getChineseMapFont(value: unknown): ChineseMapFontDefinition {
  return byId.get(isChineseMapFontId(value) ? value : DEFAULT_CHINESE_MAP_FONT)!;
}

function quotedFamily(family: string): string {
  return /\s/.test(family) ? `"${family}"` : family;
}

/**
 * The family written onto rendered Chinese text. The source mode returns the original stack
 * untouched; the original is also the first fallback in Chinese mode so Latin runs keep its look.
 */
export function resolveMapFontFamily(
  originalFamily: unknown,
  displayMode: unknown,
  mapFont: unknown
): string {
  const original = typeof originalFamily === "string" ? originalFamily.trim() : "";
  if (displayMode === "source") return original;

  const font = getChineseMapFont(mapFont);
  return [
    quotedFamily(font.family),
    original,
    ...font.fallbackFamilies.map(quotedFamily),
    font.genericFamily
  ]
    .filter(Boolean)
    .join(", ");
}

export function getConfiguredMapFont(): ChineseMapFontDefinition {
  return getChineseMapFont(globalThis.options?.map?.localization?.mapFont);
}

export function getConfiguredMapFontFamily(originalFamily: unknown): string {
  return resolveMapFontFamily(
    originalFamily,
    globalThis.options?.map?.localization?.displayMode,
    globalThis.options?.map?.localization?.mapFont
  );
}

export function getConfiguredMapFontFace() {
  const font = getConfiguredMapFont();
  return {
    family: font.family,
    src: `url('${font.src}')`,
    unicodeRange: CHINESE_FONT_UNICODE_RANGE,
    weight: font.weight
  };
}
