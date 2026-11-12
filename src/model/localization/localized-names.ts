export const LOCALIZED_NAME_SOURCES = [
  "user",
  "manual",
  "transliteration",
  "translation",
  "import",
  "unknown"
] as const;

export type LocalizedNameSource = (typeof LOCALIZED_NAME_SOURCES)[number];

export const LOCALIZED_NAME_STATUSES = ["confirmed", "preview", "stale"] as const;

export type LocalizedNameStatus = (typeof LOCALIZED_NAME_STATUSES)[number];

export const LOCALIZED_NAME_DISPLAY_MODES = ["zh", "source", "bilingual"] as const;

export type LocalizedNameDisplayMode = (typeof LOCALIZED_NAME_DISPLAY_MODES)[number];

export const BILINGUAL_NAME_SEPARATOR = " · ";

/** One Chinese name proposal or confirmed name, tied to the source name it was made from */
export interface LocalizedName {
  text: string;
  pinyin?: string;
  aliases?: string[];
  source: LocalizedNameSource;
  status: LocalizedNameStatus;
  sourceName?: string;
  sourceFullName?: string;
  sourceHash: string;
}

/** The entity-level extension. `zh` keeps the T03 shape; the other slots are explicit priorities. */
export interface LocalizedNames {
  zh?: LocalizedName;
  zhOverride?: LocalizedName;
  zhPreview?: LocalizedName;
}

export interface LocalizedNameSourceFields {
  name?: unknown;
  fullName?: unknown;
  labelText?: unknown;
  fallbackText?: unknown;
}

export type LocalizedNameTier = "override" | "confirmed" | "preview" | "label" | "source" | "empty";

export interface ResolvedLocalizedName {
  text: string;
  tier: LocalizedNameTier;
  localizedName?: LocalizedName;
}

interface LocalizedNameCarrier {
  localizedNames?: LocalizedNames;
}

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
] as const;

const rotateRight = (value: number, bits: number): number => (value >>> bits) | (value << (32 - bits));

function sha256(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;

  const view = new DataView(data.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < data.length; offset += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index++) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index++) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return hash.map(value => value.toString(16).padStart(8, "0")).join("");
}

/** Stable source identity used to detect renames without storing the name twice */
export function normalizeLocalizedNameSource(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

/** The first 16 hex digits match the T03 `localizedNames.zh.sourceHash` convention */
export function getLocalizedNameSourceHash(sourceName: unknown): string {
  return sha256(normalizeLocalizedNameSource(sourceName)).slice(0, 16);
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return nonEmptyString(value)?.trim();
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const aliases = [...new Set(value.flatMap(alias => optionalString(alias) ?? []))];
  return aliases.length ? aliases : undefined;
}

function asSource(value: unknown, fallback: LocalizedNameSource): LocalizedNameSource {
  return typeof value === "string" && (LOCALIZED_NAME_SOURCES as readonly string[]).includes(value)
    ? (value as LocalizedNameSource)
    : fallback;
}

function asStatus(value: unknown, fallback: LocalizedNameStatus): LocalizedNameStatus {
  return typeof value === "string" && (LOCALIZED_NAME_STATUSES as readonly string[]).includes(value)
    ? (value as LocalizedNameStatus)
    : fallback;
}

/** Parse one stored candidate without letting incomplete old data stop a map from loading */
export function parseLocalizedName(
  value: unknown,
  defaults: { source?: LocalizedNameSource; status?: LocalizedNameStatus } = {}
): LocalizedName | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const text = nonEmptyString(record.text);
  if (!text) return undefined;

  const sourceName = optionalString(record.sourceName);
  const sourceFullName = optionalString(record.sourceFullName);
  const source = asSource(record.source, defaults.source ?? "unknown");
  return {
    text,
    pinyin: optionalString(record.pinyin),
    aliases: stringList(record.aliases),
    source,
    status: asStatus(record.status, defaults.status ?? "confirmed"),
    sourceName,
    sourceFullName,
    sourceHash: optionalString(record.sourceHash) ?? getLocalizedNameSourceHash(sourceName)
  };
}

export function parseLocalizedNames(value: unknown): LocalizedNames | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const localizedNames: LocalizedNames = {
    zh: parseLocalizedName(record.zh),
    zhOverride: parseLocalizedName(record.zhOverride, { source: "user", status: "confirmed" }),
    zhPreview: parseLocalizedName(record.zhPreview, { status: "preview" })
  };
  return localizedNames.zh || localizedNames.zhOverride || localizedNames.zhPreview ? localizedNames : undefined;
}

export function createLocalizedName({
  text,
  sourceName,
  sourceFullName,
  source = "manual",
  status = "confirmed",
  pinyin,
  aliases
}: {
  text: string;
  sourceName?: string;
  sourceFullName?: string;
  source?: LocalizedNameSource;
  status?: LocalizedNameStatus;
  pinyin?: string;
  aliases?: string[];
}): LocalizedName {
  const sourceText = nonEmptyString(text);
  if (!sourceText) throw new Error("A Chinese name must not be empty");
  return {
    text: sourceText,
    pinyin: optionalString(pinyin),
    aliases: stringList(aliases),
    source,
    status,
    sourceName: optionalString(sourceName),
    sourceFullName: optionalString(sourceFullName),
    sourceHash: getLocalizedNameSourceHash(sourceName)
  };
}

function getOriginalText(source: LocalizedNameSourceFields): { text: string; tier: "label" | "source" | "empty" } {
  const labelText = nonEmptyString(source.labelText);
  if (labelText) return { text: labelText, tier: "label" };

  const fallbackText = nonEmptyString(source.fallbackText);
  if (fallbackText) return { text: fallbackText, tier: "source" };

  const fullName = nonEmptyString(source.fullName);
  if (fullName) return { text: fullName, tier: "source" };

  const name = nonEmptyString(source.name);
  if (name) return { text: name, tier: "source" };
  return { text: "", tier: "empty" };
}

export function isLocalizedNameStale(localizedName: LocalizedName, source: LocalizedNameSourceFields): boolean {
  if (localizedName.status === "stale") return true;

  const sourceName = normalizeLocalizedNameSource(source.name);
  const sourceFullName = normalizeLocalizedNameSource(source.fullName);
  const storedName = normalizeLocalizedNameSource(localizedName.sourceName);
  const storedFullName = normalizeLocalizedNameSource(localizedName.sourceFullName);

  if (storedName && storedName !== sourceName) return true;
  if (storedFullName && storedFullName !== sourceFullName) return true;
  if (localizedName.sourceHash && localizedName.sourceHash !== getLocalizedNameSourceHash(source.name)) return true;
  return false;
}

function staleCandidate(localizedName: LocalizedName | undefined, source: LocalizedNameSourceFields) {
  if (!localizedName || localizedName.status === "stale" || !isLocalizedNameStale(localizedName, source))
    return localizedName;
  return { ...localizedName, status: "stale" as const };
}

/** Return the extension with any changed source marked stale, preserving unknown fields */
export function refreshLocalizedNames(value: unknown, source: LocalizedNameSourceFields): LocalizedNames | undefined {
  const parsed = parseLocalizedNames(value);
  if (!parsed) return undefined;

  const record = value as Record<string, unknown>;
  const zh = staleCandidate(parsed.zh, source);
  const zhOverride = staleCandidate(parsed.zhOverride, source);
  const zhPreview = staleCandidate(parsed.zhPreview, source);
  return {
    ...record,
    zh,
    zhOverride,
    zhPreview
  };
}

/** Mark the persisted entity extension stale when its source name or full name changed */
export function refreshEntityLocalizedNames(
  entity: LocalizedNameCarrier,
  source: LocalizedNameSourceFields
): LocalizedNames | undefined {
  if (!entity.localizedNames) return undefined;
  entity.localizedNames = refreshLocalizedNames(entity.localizedNames, source);
  return entity.localizedNames;
}

export function resolveLocalizedName({
  displayMode,
  localizedNames,
  includePreview = true,
  ...source
}: LocalizedNameSourceFields & {
  displayMode?: unknown;
  localizedNames?: unknown;
  includePreview?: boolean;
}): ResolvedLocalizedName {
  const original = getOriginalText(source);
  if (displayMode === "source") return original;

  const parsed = parseLocalizedNames(localizedNames);
  if (!parsed) return original;

  const candidates: Array<[LocalizedName | undefined, LocalizedNameTier]> = [
    [parsed.zhOverride, "override"],
    [parsed.zh?.status === "confirmed" ? parsed.zh : undefined, "confirmed"],
    [includePreview ? parsed.zhPreview : undefined, "preview"],
    [includePreview && parsed.zh?.status === "preview" ? parsed.zh : undefined, "preview"]
  ];

  for (const [candidate, tier] of candidates) {
    if (!candidate || isLocalizedNameStale(candidate, source)) continue;
    if (displayMode !== "bilingual") return { text: candidate.text, tier, localizedName: candidate };

    return {
      text: combineBilingualName(candidate.text, original.text),
      tier,
      localizedName: candidate
    };
  }

  return original;
}

function comparableName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

/** One stable bilingual form, with either side omitted when it repeats the other */
export function combineBilingualName(localizedText: string, originalText: string): string {
  const localized = localizedText.trim();
  const original = originalText.trim();
  if (!localized) return original;
  if (!original) return localized;

  const normalizedLocalized = comparableName(localized);
  const normalizedOriginal = comparableName(original);
  if (normalizedLocalized === normalizedOriginal) return localized;
  if (normalizedOriginal.includes(normalizedLocalized)) return original;
  return `${localized}${BILINGUAL_NAME_SEPARATOR}${original}`;
}
