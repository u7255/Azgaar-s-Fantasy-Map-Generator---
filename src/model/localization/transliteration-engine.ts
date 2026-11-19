import { type ChineseNameStyle, type ChineseNameStyleId, resolveChineseNameStyle } from "./chinese-name-styles";
import { createLocalizedName, type LocalizedName } from "./localized-names";
import {
  assessChineseNameLength,
  type ChineseNameEntityType,
  type ChineseNameLengthAssessment,
  countChineseNameCharacters,
  getChineseNameLengthBudget
} from "./name-length-budget";
import {
  type ChineseNameDictionaryExtension,
  type ChineseNameRuleLayer,
  COMPLETE_NAME_DICTIONARY,
  CONSONANT_CLUSTER_TRANSLATIONS,
  CONSONANT_CLUSTERS,
  CONSONANT_CODA_TRANSLATIONS,
  PHONETIC_SYLLABLE_OVERRIDES,
  SIMPLE_ONSET_TRANSLATIONS,
  SIMPLE_ONSET_VOWEL_SYLLABLES,
  SINGLE_CHARACTER_FALLBACK,
  TYPE_DEDUPLICATION_ENDINGS,
  TYPE_PHRASE_TRANSLATIONS,
  VOWEL_COMBINATIONS,
  WORD_TRANSLATIONS
} from "./transliteration-dictionary";

export interface ChineseNameSource {
  name: string;
  fullName?: string;
  /** A river or feature type already stored separately from its source name. */
  type?: string;
}

export type ChineseNameOverrides = Readonly<Record<string, string>> | ReadonlyMap<string, string>;

export interface ChineseNameSuggestionOptions {
  /** Manual review data. Values only replace preview text and never confirm a name. */
  overrides?: ChineseNameOverrides;
  /** Additional auditable names, words and type phrases. */
  dictionary?: ChineseNameDictionaryExtension;
  /** Entity type selects the short-name budget and preferred suffixes. */
  entityType?: ChineseNameEntityType;
  /** Global map style. Unknown or missing values fall back to western medieval. */
  style?: ChineseNameStyle | ChineseNameStyleId | string;
}

export interface ChineseNameSuggestion {
  localizedName: LocalizedName;
  /** First-use order of the six rule layers, plus any manual override. */
  layers: ChineseNameRuleLayer[];
  /** Present when an entity type supplied a short-name budget. */
  length?: ChineseNameLengthAssessment;
}

export interface ChineseNameCollision {
  text: string;
  sourceNames: string[];
}

interface RuntimeDictionary {
  names: ReadonlyMap<string, string>;
  words: ReadonlyMap<string, string>;
  wordKeys: readonly string[];
  typePhrases: ReadonlyMap<string, string>;
  typePhraseKeys: readonly string[];
}

interface SuggestionRun {
  dictionary: RuntimeDictionary;
  overrides: ReadonlyMap<string, string>;
  layers: ChineseNameRuleLayer[];
  style: ChineseNameStyle;
  entityType?: ChineseNameEntityType;
}

interface Syllable {
  source: string;
  onset: string;
  nucleus: string;
  coda: string;
}

const VOWEL_CHARACTERS = new Set(["a", "e", "i", "o", "u", "y"]);
const HAN_CHARACTERS = /\p{Script=Han}/u;
const LETTERS_ONLY = /[^a-z]/g;
const SORTED_VOWEL_KEYS = Object.keys(VOWEL_COMBINATIONS).sort((a, b) => b.length - a.length);
const VALID_ONSETS = new Set<string>([...CONSONANT_CLUSTERS, ...Object.keys(SIMPLE_ONSET_TRANSLATIONS)]);
const DROPPED_PROPER_NAME_WORDS = new Set(["the", "of"]);
const SIMPLE_VOWEL_HEADS = new Set(["a", "e", "i", "o", "u", "y"]);
const DIGRAPH_VOWELS: Readonly<Record<string, readonly [string, string, string, string, string, string]>> = {
  ch: ["查", "切", "奇", "乔", "楚", "奇"],
  ph: ["法", "费", "菲", "福", "弗", "菲"],
  sh: ["沙", "谢", "希", "肖", "舒", "希"],
  th: ["萨", "塞", "西", "索", "苏", "西"],
  wh: ["瓦", "韦", "维", "沃", "乌", "维"]
};

function normalizeSuggestionKey(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[‘’]/gu, "'")
    .replace(/[‐‑‒–—―]/gu, "-")
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, " ");
}

function normalizePhoneticWord(value: string): string {
  return normalizeSuggestionKey(value).normalize("NFKD").replace(/\p{M}/gu, "").replace(LETTERS_ONLY, "");
}

function addLayer(layers: ChineseNameRuleLayer[], layer: ChineseNameRuleLayer): void {
  if (!layers.includes(layer)) layers.push(layer);
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function addDictionaryEntries(target: Map<string, string>, values: Readonly<Record<string, string>> | undefined): void {
  if (!values) return;
  for (const [source, text] of Object.entries(values)) {
    const key = normalizeSuggestionKey(source);
    const translation = cleanText(text);
    if (key && translation) target.set(key, translation);
  }
}

function createRuntimeDictionary(
  extension: ChineseNameDictionaryExtension | undefined,
  style: ChineseNameStyle,
  includeStyleWords: boolean
): RuntimeDictionary {
  const names = new Map(Object.entries(COMPLETE_NAME_DICTIONARY));
  const words = new Map(Object.entries(WORD_TRANSLATIONS));
  const typePhrases = new Map(Object.entries(TYPE_PHRASE_TRANSLATIONS));
  if (includeStyleWords) addDictionaryEntries(words, style.words);
  addDictionaryEntries(names, extension?.names);
  addDictionaryEntries(words, extension?.words);
  addDictionaryEntries(typePhrases, extension?.typePhrases);

  return {
    names,
    words,
    wordKeys: [...words.keys()].sort((a, b) => b.length - a.length),
    typePhrases,
    typePhraseKeys: [...typePhrases.keys()].sort((a, b) => b.length - a.length)
  };
}

function suggestionStyle(value: ChineseNameSuggestionOptions["style"]): ChineseNameStyle {
  return value && typeof value === "object" ? value : resolveChineseNameStyle(value);
}

function createOverrideMap(overrides: ChineseNameOverrides | undefined): ReadonlyMap<string, string> {
  const normalized = new Map<string, string>();
  if (!overrides) return normalized;

  if (typeof (overrides as ReadonlyMap<string, string>).get === "function") {
    for (const [source, text] of overrides as ReadonlyMap<string, string>) {
      const key = normalizeSuggestionKey(source);
      const translation = cleanText(text);
      if (key && translation) normalized.set(key, translation);
    }
    return normalized;
  }

  for (const [source, text] of Object.entries(overrides)) {
    const key = normalizeSuggestionKey(source);
    const translation = cleanText(text);
    if (key && translation) normalized.set(key, translation);
  }
  return normalized;
}

function getManualOverride(run: SuggestionRun, value: string): string | undefined {
  const key = normalizeSuggestionKey(value);
  const text = key ? run.overrides.get(key) : undefined;
  if (text) addLayer(run.layers, "manual-override");
  return text;
}

function buildDisplayName(source: ChineseNameSource, dictionary: RuntimeDictionary): string {
  const name = cleanText(source.name);
  if (!name) throw new Error("A Chinese name suggestion needs a non-empty source name");

  const fullName = cleanText(source.fullName);
  if (fullName) return fullName;

  const type = cleanText(source.type);
  if (!type) return name;
  if (!lookupTypePhrase(dictionary, type)) return name;
  const nameKey = normalizeSuggestionKey(name);
  const typeKey = normalizeSuggestionKey(type);
  return nameKey.endsWith(typeKey) ? name : `${name} ${type}`;
}

function normalizeSource(source: string | ChineseNameSource): ChineseNameSource {
  if (typeof source === "string") return { name: source };
  return source;
}

function lookupWord(dictionary: RuntimeDictionary, word: string): string | undefined {
  const key = normalizeSuggestionKey(word);
  if (!key) return undefined;

  const candidates = [key];
  if (key.endsWith("'s")) candidates.push(key.slice(0, -2));
  if (key.endsWith("ies")) candidates.push(`${key.slice(0, -3)}y`);
  if (key.endsWith("es")) candidates.push(key.slice(0, -2));
  if (key.endsWith("s")) candidates.push(key.slice(0, -1));

  for (const candidate of candidates) {
    const translation = dictionary.words.get(candidate);
    if (translation) return translation;
  }
  return undefined;
}

function lookupTypePhrase(dictionary: RuntimeDictionary, value: string): [string, string] | undefined {
  const key = normalizeSuggestionKey(value);
  if (!key) return undefined;

  const direct = dictionary.typePhrases.get(key);
  if (direct) return [key, direct];
  if (key.endsWith("s")) {
    const singular = key.slice(0, -1);
    const translation = dictionary.typePhrases.get(singular);
    if (translation) return [singular, translation];
  }
  return undefined;
}

interface TypePhraseMatch {
  key: string;
  properName: string;
  translation: string;
}

function parseTypePhrase(displayName: string, dictionary: RuntimeDictionary): TypePhraseMatch | undefined {
  const key = normalizeSuggestionKey(displayName);
  const ofMatch = /^(.+?) of (.+)$/u.exec(key);
  if (ofMatch) {
    const left = lookupTypePhrase(dictionary, ofMatch[1]);
    if (left) return { key: left[0], properName: ofMatch[2], translation: left[1] };

    const right = lookupTypePhrase(dictionary, ofMatch[2]);
    if (right) return { key: right[0], properName: ofMatch[1], translation: right[1] };
  }

  for (const phrase of dictionary.typePhraseKeys) {
    if (key.startsWith(`${phrase} `)) {
      return {
        key: phrase,
        properName: key.slice(phrase.length + 1),
        translation: dictionary.typePhrases.get(phrase)!
      };
    }
    if (key.endsWith(` ${phrase}`)) {
      return {
        key: phrase,
        properName: key.slice(0, -(phrase.length + 1)),
        translation: dictionary.typePhrases.get(phrase)!
      };
    }
  }
  return undefined;
}

function hasTypeEnding(name: string, typeKey: string): boolean {
  const endings = (TYPE_DEDUPLICATION_ENDINGS as Readonly<Record<string, readonly string[]>>)[typeKey];
  return Boolean(endings?.some(ending => name.endsWith(ending)));
}

function appendTypeName(properName: string, match: TypePhraseMatch): string {
  if (!properName) return match.translation;
  if (hasTypeEnding(properName, match.key)) return properName;
  return `${properName}${match.translation}`;
}

function isVowel(character: string | undefined): boolean {
  return Boolean(character && VOWEL_CHARACTERS.has(character));
}

function longestVowelAt(word: string, position: number): string | undefined {
  return SORTED_VOWEL_KEYS.find(candidate => word.startsWith(candidate, position));
}

function splitIntervocalicCluster(cluster: string): [coda: string, nextOnset: string] {
  if (!cluster) return ["", ""];
  for (let length = Math.min(cluster.length, 3); length >= 1; length--) {
    const candidate = cluster.slice(-length);
    if (VALID_ONSETS.has(candidate)) return [cluster.slice(0, -length), candidate];
  }
  return [cluster.slice(0, -1), cluster.slice(-1)];
}

function splitSyllables(word: string): Syllable[] {
  const syllables: Syllable[] = [];
  let position = 0;

  while (position < word.length) {
    let nucleusStart = position;
    while (nucleusStart < word.length && !isVowel(word[nucleusStart])) nucleusStart++;

    if (nucleusStart === word.length) {
      syllables.push({ source: word.slice(position), onset: word.slice(position), nucleus: "", coda: "" });
      break;
    }

    const onset = word.slice(position, nucleusStart);
    const nucleus = longestVowelAt(word, nucleusStart);
    if (!nucleus) {
      syllables.push({ source: word.slice(position), onset, nucleus: "", coda: "" });
      break;
    }

    const afterNucleus = nucleusStart + nucleus.length;
    let nextVowel = afterNucleus;
    while (nextVowel < word.length && !isVowel(word[nextVowel])) nextVowel++;

    if (nextVowel === word.length) {
      const coda = word.slice(afterNucleus);
      syllables.push({ source: `${onset}${nucleus}${coda}`, onset, nucleus, coda });
      break;
    }

    const [coda, nextOnset] = splitIntervocalicCluster(word.slice(afterNucleus, nextVowel));
    syllables.push({ source: `${onset}${nucleus}${coda}`, onset, nucleus, coda });
    position = nextVowel - nextOnset.length;
  }

  return syllables;
}

function fallbackCharacters(value: string, run: SuggestionRun): string {
  addLayer(run.layers, "character-fallback");
  return [...value]
    .map(character => {
      const key = normalizePhoneticWord(character);
      return (SINGLE_CHARACTER_FALLBACK as Readonly<Record<string, string>>)[key] ?? "克";
    })
    .join("");
}

function vowelHeadIndex(nucleus: string): number {
  const head = nucleus[0] ?? "";
  return ["a", "e", "i", "o", "u", "y"].indexOf(head);
}

function translateClusterVowel(onset: string, nucleus: string): string | undefined {
  const digraph = DIGRAPH_VOWELS[onset];
  if (digraph) {
    const index = vowelHeadIndex(nucleus);
    if (index >= 0) return digraph[index];
  }

  const cluster = (CONSONANT_CLUSTER_TRANSLATIONS as Readonly<Record<string, string>>)[onset];
  if (!cluster) return undefined;

  const head = nucleus[0];
  if (onset.endsWith("r") || onset.endsWith("l")) {
    const tails: Readonly<Record<string, string>> = { a: "拉", e: "雷", i: "里", o: "罗", u: "鲁", y: "里" };
    return `${cluster}${tails[head] ?? ""}`;
  }

  if (onset.length === 2 && onset.startsWith("s")) {
    const second = onset[1];
    const secondSyllable = SIMPLE_ONSET_VOWEL_SYLLABLES[`${second}${head}`];
    if (secondSyllable) return `${cluster}${secondSyllable}`;
  }

  return `${cluster}${(VOWEL_COMBINATIONS as Readonly<Record<string, string>>)[nucleus] ?? ""}`;
}

function translateCoda(coda: string, run: SuggestionRun): string {
  if (!coda) return "";
  const direct = (CONSONANT_CODA_TRANSLATIONS as Readonly<Record<string, string>>)[coda];
  if (direct) return direct;
  return fallbackCharacters(coda, run);
}

function translateSyllable(syllable: Syllable, run: SuggestionRun): string {
  const override = (PHONETIC_SYLLABLE_OVERRIDES as Readonly<Record<string, string>>)[syllable.source];
  if (override) {
    if (syllable.onset) addLayer(run.layers, "consonant-clusters");
    if (syllable.nucleus) addLayer(run.layers, "vowel-combinations");
    return override;
  }

  if (!syllable.nucleus) return fallbackCharacters(syllable.source, run);

  if (syllable.onset) addLayer(run.layers, "consonant-clusters");
  if ((VOWEL_COMBINATIONS as Readonly<Record<string, string>>)[syllable.nucleus]) {
    addLayer(run.layers, "vowel-combinations");
  }

  let base: string;
  if (!syllable.onset) {
    base =
      (VOWEL_COMBINATIONS as Readonly<Record<string, string>>)[syllable.nucleus] ??
      fallbackCharacters(syllable.nucleus, run);
  } else {
    const simple = SIMPLE_ONSET_VOWEL_SYLLABLES[`${syllable.onset}${syllable.nucleus}`];
    if (simple) {
      base = simple;
    } else if (SIMPLE_VOWEL_HEADS.has(syllable.nucleus)) {
      const simpleHead = syllable.nucleus === "y" ? "i" : syllable.nucleus;
      const simpleOnset = SIMPLE_ONSET_VOWEL_SYLLABLES[`${syllable.onset}${simpleHead}`];
      const cluster = translateClusterVowel(syllable.onset, syllable.nucleus);
      const onsetTranslation =
        cluster ?? (SIMPLE_ONSET_TRANSLATIONS as Readonly<Record<string, string>>)[syllable.onset];
      if (simpleOnset) {
        base = simpleOnset;
      } else if (onsetTranslation) {
        const vowel = (VOWEL_COMBINATIONS as Readonly<Record<string, string>>)[syllable.nucleus];
        base = `${onsetTranslation}${vowel ?? ""}`;
      } else {
        base = `${fallbackCharacters(syllable.onset, run)}${
          (VOWEL_COMBINATIONS as Readonly<Record<string, string>>)[syllable.nucleus]
        }`;
      }
    } else {
      const simpleHead = syllable.nucleus[0] === "y" ? "i" : syllable.nucleus[0];
      const first = SIMPLE_ONSET_VOWEL_SYLLABLES[`${syllable.onset}${simpleHead}`];
      const cluster = translateClusterVowel(syllable.onset, syllable.nucleus);
      const onsetTranslation =
        cluster ?? (SIMPLE_ONSET_TRANSLATIONS as Readonly<Record<string, string>>)[syllable.onset];
      const vowel = (VOWEL_COMBINATIONS as Readonly<Record<string, string>>)[syllable.nucleus];
      base = first ?? `${onsetTranslation ?? fallbackCharacters(syllable.onset, run)}${vowel ?? ""}`;
    }
  }

  return `${base}${translateCoda(syllable.coda, run)}`;
}

function transliterateWord(word: string, run: SuggestionRun): string {
  const phonetic = normalizePhoneticWord(word);
  if (!phonetic) return fallbackCharacters(word, run);

  const syllables = splitSyllables(phonetic);
  if (!syllables.length) return fallbackCharacters(phonetic, run);
  return syllables.map(syllable => translateSyllable(syllable, run)).join("");
}

function translateCompoundRoots(word: string, run: SuggestionRun): string | undefined {
  const key = normalizeSuggestionKey(word);
  if (key.length < 5) return undefined;

  const parts: string[] = [];
  let position = 0;
  while (position < key.length) {
    const remaining = key.slice(position);
    const match = run.dictionary.wordKeys.find(candidate => candidate.length >= 3 && remaining.startsWith(candidate));
    if (!match) break;
    parts.push(run.dictionary.words.get(match)!);
    position += match.length;
  }

  if (!parts.length) return undefined;
  return `${parts.join("")}${position < key.length ? transliterateWord(key.slice(position), run) : ""}`;
}

function translateProperPhrase(phrase: string, run: SuggestionRun): string {
  const cleaned = cleanText(phrase);
  if (!cleaned) return "";
  if (HAN_CHARACTERS.test(cleaned)) return cleaned;

  const manual = getManualOverride(run, cleaned);
  if (manual) return manual;

  const normalized = normalizeSuggestionKey(cleaned);
  const complete = run.dictionary.names.get(normalized);
  if (complete) {
    addLayer(run.layers, "complete-dictionary");
    return complete;
  }

  const standaloneType = run.dictionary.typePhrases.get(normalized);
  if (standaloneType) {
    addLayer(run.layers, "type-phrase");
    return standaloneType;
  }

  const words = normalized.split(/[\s-]+/u).filter(Boolean);
  const translated = words.flatMap(word => {
    if (DROPPED_PROPER_NAME_WORDS.has(word)) return [];

    const manualWord = getManualOverride(run, word);
    if (manualWord) return [manualWord];

    const semantic = lookupWord(run.dictionary, word);
    if (semantic) {
      addLayer(run.layers, "roots");
      return [semantic];
    }

    const compound = translateCompoundRoots(word, run);
    if (compound) {
      addLayer(run.layers, "roots");
      return [compound];
    }
    return [transliterateWord(word, run)];
  });

  return translated.join("");
}

function stableIndex(value: string, length: number): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return length ? hash % length : 0;
}

function preferredSuffixes(run: SuggestionRun): readonly string[] {
  if (!run.entityType) return [];
  return run.style.suffixes[run.entityType] ?? [];
}

function hasPreferredEnding(text: string, run: SuggestionRun): boolean {
  return preferredSuffixes(run).some(suffix => text.endsWith(suffix));
}

function preferredSuffix(source: ChineseNameSource, run: SuggestionRun): string | undefined {
  const suffixes = preferredSuffixes(run);
  if (!suffixes.length) return undefined;
  const key = `${source.fullName ?? ""}|${source.name}|${run.entityType}`;
  return suffixes[stableIndex(key, suffixes.length)];
}

function mixedPrefix(source: ChineseNameSource, run: SuggestionRun): string {
  if (!run.style.hybrid) return "";
  const prefixes = ["临", "云", "青", "白"];
  return prefixes[stableIndex(`${source.fullName ?? ""}|${source.name}`, prefixes.length)];
}

function appendPreferredSuffix(text: string, source: ChineseNameSource, run: SuggestionRun): string {
  if (!text || hasPreferredEnding(text, run)) return text;
  const suffix = preferredSuffix(source, run);
  return suffix ? `${text}${suffix}` : text;
}

function transliterateWordCompact(word: string, maxCharacters: number, run: SuggestionRun): string {
  const phonetic = normalizePhoneticWord(word);
  if (!phonetic) return fallbackCharacters(word, run);

  const syllables = splitSyllables(phonetic);
  if (!syllables.length) return fallbackCharacters(phonetic, run);

  let result = "";
  for (const syllable of syllables) {
    const piece = translateSyllable(syllable, run);
    const candidate = `${result}${piece}`;
    if (result && countChineseNameCharacters(candidate) > maxCharacters) {
      addLayer(run.layers, "length-compression");
      break;
    }
    result = candidate;
  }
  return result || transliterateWord(phonetic, run);
}

/** Compress by complete semantic roots or complete syllables. No Han substring is ever sliced. */
function compactProperPhrase(phrase: string, maxCharacters: number, run: SuggestionRun): string {
  const cleaned = cleanText(phrase);
  if (!cleaned) return "";
  if (HAN_CHARACTERS.test(cleaned)) return cleaned;

  const manual = getManualOverride(run, cleaned);
  if (manual) return manual;

  const normalized = normalizeSuggestionKey(cleaned);
  const complete = run.dictionary.names.get(normalized);
  if (complete) {
    addLayer(run.layers, "complete-dictionary");
    return complete;
  }

  const words = normalized.split(/[\s-]+/u).filter(Boolean);
  const parts: string[] = [];
  for (const word of words) {
    if (DROPPED_PROPER_NAME_WORDS.has(word)) continue;

    const manualWord = getManualOverride(run, word);
    const semantic = manualWord ?? lookupWord(run.dictionary, word);
    let piece = semantic;
    if (piece) {
      addLayer(run.layers, "roots");
    } else {
      piece = translateCompoundRoots(word, run);
      if (piece) {
        addLayer(run.layers, "roots");
      } else {
        const remaining = Math.max(1, maxCharacters - countChineseNameCharacters(parts.join("")));
        piece = transliterateWordCompact(word, remaining, run);
      }
    }
    if (!piece) continue;

    const candidate = parts.join("") + piece;
    if (parts.length && countChineseNameCharacters(candidate) > maxCharacters) {
      addLayer(run.layers, "length-compression");
      break;
    }
    parts.push(piece);
  }

  return parts.join("") || transliterateWordCompact(normalized, maxCharacters, run);
}

function buildStyledCandidates(source: ChineseNameSource, displayName: string, run: SuggestionRun): string[] {
  if (!run.entityType) return [];
  const budget = getChineseNameLengthBudget(run.entityType);
  const softTarget = budget.softMax;
  const hardTarget = budget.hardMax;
  const candidates: string[] = [];
  const typeMatch = parseTypePhrase(displayName, run.dictionary);
  const translatedType = source.type ? lookupTypePhrase(run.dictionary, source.type)?.[1] : undefined;

  if (typeMatch) {
    for (const target of [softTarget, hardTarget]) {
      const properBudget = Math.max(1, target - countChineseNameCharacters(typeMatch.translation));
      const proper = compactProperPhrase(typeMatch.properName, properBudget, run);
      candidates.push(appendTypeName(proper, typeMatch));
    }
  } else if (translatedType) {
    for (const target of [softTarget, hardTarget]) {
      const properBudget = Math.max(1, target - countChineseNameCharacters(translatedType));
      const proper = compactProperPhrase(source.name, properBudget, run);
      candidates.push(proper ? `${proper}${translatedType}` : translatedType);
    }
  } else {
    for (const target of [softTarget, hardTarget]) {
      const proper = compactProperPhrase(source.name, target, run);
      candidates.push(appendPreferredSuffix(proper, source, run));
    }
    if (run.style.hybrid) {
      const proper = compactProperPhrase(source.name, Math.max(1, softTarget - 1), run);
      const withSuffix = appendPreferredSuffix(proper, source, run);
      if (countChineseNameCharacters(`${mixedPrefix(source, run)}${withSuffix}`) <= softTarget) {
        candidates.push(`${mixedPrefix(source, run)}${withSuffix}`);
      }
    }
  }

  return candidates;
}

function chooseBudgetedText(source: ChineseNameSource, displayName: string, baseText: string, run: SuggestionRun) {
  if (!run.entityType) return { text: baseText, length: undefined };
  const entityType = run.entityType;

  const original = assessChineseNameLength(baseText, entityType);
  if (!original.overSoft) return { text: baseText, length: original };

  const candidates = [baseText, ...buildStyledCandidates(source, displayName, run)]
    .map(text => ({ text, assessment: assessChineseNameLength(text, entityType) }))
    .filter(candidate => candidate.assessment.charCount > 0);
  candidates.sort((left, right) => {
    if (left.assessment.overHard !== right.assessment.overHard) return left.assessment.overHard ? 1 : -1;
    if (left.assessment.overSoft !== right.assessment.overSoft) return left.assessment.overSoft ? 1 : -1;
    const leftTarget = Math.abs(left.assessment.charCount - (original.softMin + original.softMax) / 2);
    const rightTarget = Math.abs(right.assessment.charCount - (original.softMin + original.softMax) / 2);
    if (leftTarget !== rightTarget) return leftTarget - rightTarget;
    return left.assessment.charCount - right.assessment.charCount;
  });

  const chosen = candidates[0];
  if (chosen.text !== baseText) addLayer(run.layers, "length-compression");
  return { text: chosen.text, length: chosen.assessment };
}

function buildSuggestion(source: ChineseNameSource, run: SuggestionRun): LocalizedName {
  const name = cleanText(source.name);
  if (!name) throw new Error("A Chinese name suggestion needs a non-empty source name");

  const fullName = cleanText(source.fullName);
  const displayName = buildDisplayName(source, run.dictionary);
  const manual = getManualOverride(run, displayName);
  let text = manual;

  if (!text) {
    if (HAN_CHARACTERS.test(displayName)) {
      text = displayName;
    } else {
      const complete = run.dictionary.names.get(normalizeSuggestionKey(displayName));
      if (complete) {
        addLayer(run.layers, "complete-dictionary");
        text = complete;
      } else {
        const typeMatch = parseTypePhrase(displayName, run.dictionary);
        if (typeMatch) {
          addLayer(run.layers, "type-phrase");
          text = appendTypeName(translateProperPhrase(typeMatch.properName, run), typeMatch);
        } else {
          text = translateProperPhrase(displayName, run);
        }
      }
    }
  }

  const fitted = chooseBudgetedText(source, displayName, text, run);
  return createLocalizedName({
    text: fitted.text,
    sourceName: name,
    sourceFullName: fullName,
    source: "transliteration",
    status: "preview",
    styleId: run.style.id
  });
}

/** Return one T04 preview record. The input object and map are never modified. */
export function suggestChineseName(
  source: string | ChineseNameSource,
  options: ChineseNameSuggestionOptions = {}
): LocalizedName {
  return suggestChineseNameWithTrace(source, options).localizedName;
}

/** Same deterministic suggestion with non-persisted rule-layer diagnostics. */
export function suggestChineseNameWithTrace(
  source: string | ChineseNameSource,
  options: ChineseNameSuggestionOptions = {}
): ChineseNameSuggestion {
  const style = suggestionStyle(options.style);
  const run: SuggestionRun = {
    dictionary: createRuntimeDictionary(options.dictionary, style, Boolean(options.entityType)),
    overrides: createOverrideMap(options.overrides),
    layers: [],
    style,
    entityType: options.entityType
  };
  const localizedName = buildSuggestion(normalizeSource(source), run);
  return {
    localizedName,
    layers: run.layers,
    length: options.entityType ? assessChineseNameLength(localizedName.text, options.entityType) : undefined
  };
}

export function suggestChineseNames(
  sources: readonly (string | ChineseNameSource)[],
  options: ChineseNameSuggestionOptions = {}
): LocalizedName[] {
  const style = suggestionStyle(options.style);
  const dictionary = createRuntimeDictionary(options.dictionary, style, Boolean(options.entityType));
  const overrides = createOverrideMap(options.overrides);
  return sources.map(source =>
    buildSuggestion(normalizeSource(source), {
      dictionary,
      overrides,
      layers: [],
      style,
      entityType: options.entityType
    })
  );
}

/** Detect different source names that collapse to the same Chinese suggestion. */
export function findLocalizedNameCollisions(names: readonly LocalizedName[]): ChineseNameCollision[] {
  const groups = new Map<string, Map<string, string>>();

  for (const name of names) {
    const text = cleanText(name.text);
    if (!text) continue;
    const identity =
      cleanText(name.sourceFullName) ?? cleanText(name.sourceName) ?? cleanText(name.sourceHash) ?? "unknown";
    const sources = groups.get(text) ?? new Map<string, string>();
    sources.set(identity, cleanText(name.sourceFullName) ?? cleanText(name.sourceName) ?? identity);
    groups.set(text, sources);
  }

  return [...groups.entries()]
    .filter(([, sources]) => sources.size > 1)
    .map(([text, sources]) => ({
      text,
      sourceNames: [...sources.values()].sort(compareText)
    }))
    .sort((a, b) => compareText(a.text, b.text));
}

/** Explicit alias for callers that already work with the T04 model terminology. */
export const suggestLocalizedName = suggestChineseName;
