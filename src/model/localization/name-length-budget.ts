export const CHINESE_NAME_ENTITY_TYPES = [
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
  "good",
  "lore"
] as const;

export type ChineseNameEntityType = (typeof CHINESE_NAME_ENTITY_TYPES)[number];

export interface ChineseNameLengthBudget {
  softMin: number;
  softMax: number;
  hardMax: number;
}

export interface ChineseNameLengthAssessment extends ChineseNameLengthBudget {
  charCount: number;
  belowSoft: boolean;
  overSoft: boolean;
  overHard: boolean;
}

const BUDGETS: Readonly<Record<ChineseNameEntityType, ChineseNameLengthBudget>> = {
  state: { softMin: 3, softMax: 6, hardMax: 8 },
  province: { softMin: 3, softMax: 6, hardMax: 8 },
  burg: { softMin: 2, softMax: 4, hardMax: 6 },
  river: { softMin: 2, softMax: 4, hardMax: 6 },
  route: { softMin: 2, softMax: 5, hardMax: 7 },
  feature: { softMin: 2, softMax: 5, hardMax: 7 },
  marker: { softMin: 2, softMax: 5, hardMax: 7 },
  zone: { softMin: 2, softMax: 4, hardMax: 6 },
  journey: { softMin: 3, softMax: 6, hardMax: 8 },
  market: { softMin: 2, softMax: 5, hardMax: 7 },
  culture: { softMin: 2, softMax: 5, hardMax: 7 },
  religion: { softMin: 2, softMax: 5, hardMax: 7 },
  biome: { softMin: 2, softMax: 3, hardMax: 4 },
  good: { softMin: 1, softMax: 3, hardMax: 4 },
  regiment: { softMin: 3, softMax: 6, hardMax: 8 },
  addedLabel: { softMin: 2, softMax: 5, hardMax: 7 },
  lore: { softMin: 2, softMax: 6, hardMax: 8 }
};

const HAN_CHARACTER = /\p{Script=Han}/u;

/** Punctuation, separators and Latin fallback text do not consume the name budget. */
export function countChineseNameCharacters(value: string): number {
  return [...value].filter(character => HAN_CHARACTER.test(character)).length;
}

export function getChineseNameLengthBudget(entityType: ChineseNameEntityType): ChineseNameLengthBudget {
  return BUDGETS[entityType];
}

export function assessChineseNameLength(value: string, entityType: ChineseNameEntityType): ChineseNameLengthAssessment {
  const budget = getChineseNameLengthBudget(entityType);
  const charCount = countChineseNameCharacters(value);
  return {
    ...budget,
    charCount,
    belowSoft: charCount < budget.softMin,
    overSoft: charCount > budget.softMax,
    overHard: charCount > budget.hardMax
  };
}
