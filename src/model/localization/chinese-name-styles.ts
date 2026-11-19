import type { ChineseNameEntityType } from "./name-length-budget";

export const CHINESE_NAME_STYLE_IDS = [
  "western-medieval",
  "western-early-modern",
  "western-industrial",
  "western-modern",
  "chinese-classical",
  "chinese-early-modern",
  "chinese-modern",
  "mixed-chinese-slavic"
] as const;

export type ChineseNameStyleId = (typeof CHINESE_NAME_STYLE_IDS)[number];
export type ChineseNameTradition = "western" | "slavic" | "nordic" | "chinese" | "mixed";
export type ChineseNameRegister = "medieval" | "early-modern" | "industrial" | "modern";

export interface ChineseNameStyle {
  id: ChineseNameStyleId;
  /** English catalog key; the interface translates it like every other control label. */
  label: string;
  tradition: ChineseNameTradition;
  register: ChineseNameRegister;
  commonCharactersOnly: boolean;
  hybrid: boolean;
  /** Short semantic roots that suit the style better than the neutral fallback. */
  words: Readonly<Record<string, string>>;
  /** Preferred endings by entity type. */
  suffixes: Readonly<Partial<Record<ChineseNameEntityType, readonly string[]>>>;
}

const MEDIEVAL_ROOTS = {
  ash: "灰",
  black: "黑",
  bridge: "桥",
  cold: "寒",
  dawn: "晨",
  dusk: "暮",
  field: "野",
  ford: "渡",
  frost: "霜",
  gate: "门",
  glen: "谷",
  haven: "港",
  hill: "丘",
  hold: "堡",
  iron: "铁",
  keep: "堡",
  lake: "湖",
  march: "边",
  mist: "雾",
  moon: "月",
  moor: "荒",
  oak: "橡",
  raven: "鸦",
  ridge: "岭",
  river: "河",
  run: "流",
  silver: "银",
  stone: "石",
  storm: "风暴",
  thorn: "棘",
  vale: "谷",
  watch: "望",
  water: "水",
  wolf: "狼",
  wood: "林"
} as const;

const EARLY_MODERN_ROOTS = {
  bay: "湾",
  crown: "冠",
  fort: "堡",
  harbor: "港",
  haven: "港",
  liberty: "自由",
  market: "市",
  new: "新",
  port: "港",
  royal: "王",
  saint: "圣",
  silver: "银",
  trade: "贸",
  town: "镇",
  watch: "卫"
} as const;

const INDUSTRIAL_ROOTS = {
  brass: "铜",
  bridge: "桥",
  coal: "煤",
  copper: "铜",
  engine: "机",
  factory: "厂",
  forge: "炉",
  iron: "铁",
  mill: "磨坊",
  rail: "轨",
  silver: "银",
  steam: "汽",
  steel: "钢",
  stone: "石",
  works: "工场"
} as const;

const MODERN_ROOTS = {
  central: "中",
  city: "城",
  east: "东",
  grand: "大",
  harbor: "港",
  new: "新",
  north: "北",
  port: "港",
  south: "南",
  west: "西"
} as const;

const CHINESE_CLASSICAL_ROOTS = {
  cloud: "云",
  dawn: "晨",
  east: "东",
  evening: "暮",
  field: "野",
  forest: "林",
  frost: "霜",
  hill: "丘",
  lake: "湖",
  moon: "月",
  mountain: "山",
  north: "北",
  river: "川",
  south: "南",
  star: "星",
  stone: "石",
  sun: "日",
  water: "水",
  west: "西",
  wind: "风"
} as const;

const CHINESE_EARLY_MODERN_ROOTS = {
  bridge: "桥",
  east: "东",
  harbor: "港",
  market: "市",
  mountain: "山",
  new: "新",
  north: "北",
  port: "港",
  river: "江",
  south: "南",
  west: "西"
} as const;

const CHINESE_MODERN_ROOTS = {
  central: "中",
  city: "市",
  east: "东",
  harbor: "港",
  new: "新",
  north: "北",
  port: "港",
  river: "江",
  south: "南",
  west: "西"
} as const;

const MIXED_ROOTS = {
  ash: "灰",
  black: "黑",
  bridge: "桥",
  frost: "霜",
  gate: "门",
  harbor: "港",
  hill: "丘",
  iron: "铁",
  lake: "湖",
  moon: "月",
  raven: "鸦",
  river: "河",
  silver: "银",
  stone: "石",
  storm: "风暴",
  vale: "谷",
  wolf: "狼",
  wood: "林"
} as const;

const WESTERN_MEDIEVAL_SUFFIXES = {
  state: ["王国", "公国"],
  province: ["郡", "领", "边区"],
  burg: ["堡", "镇", "村", "港", "寨"],
  river: ["河", "溪", "川"],
  route: ["道", "路", "径", "桥", "关"],
  feature: ["山", "湖", "谷", "林", "峰", "原"],
  marker: ["山", "湖", "谷", "林", "峰"],
  zone: ["地", "境", "谷", "林"],
  journey: ["之旅", "远征", "航路"],
  market: ["集", "港市", "市"],
  culture: ["族", "民"],
  religion: ["教会", "教团", "教派"],
  biome: ["林", "原", "漠", "地"],
  good: ["盐", "铁", "布", "粮"],
  regiment: ["团", "卫队", "舰队"],
  addedLabel: ["地", "境"],
  lore: ["界", "境"]
} as const;

const WESTERN_EARLY_MODERN_SUFFIXES = {
  state: ["王国", "共和国", "联邦"],
  province: ["省", "领", "边区"],
  burg: ["港", "城", "镇", "堡"],
  river: ["河", "江", "溪"],
  route: ["大道", "驿路", "桥"],
  feature: ["湾", "港", "岭", "湖"],
  marker: ["港", "城", "关"],
  zone: ["区", "领"],
  journey: ["航路", "远征"],
  market: ["市", "港市"],
  culture: ["族", "民"],
  religion: ["教会", "教团"],
  biome: ["林", "原"],
  good: ["盐", "茶", "布"],
  regiment: ["团", "卫队", "舰队"],
  addedLabel: ["港", "市"],
  lore: ["纪", "志"]
} as const;

const WESTERN_INDUSTRIAL_SUFFIXES = {
  state: ["联邦", "共和国"],
  province: ["省", "区"],
  burg: ["港", "城", "镇", "厂"],
  river: ["河", "渠"],
  route: ["铁路", "大道", "桥"],
  feature: ["矿", "岭", "湾"],
  marker: ["厂", "港", "站"],
  zone: ["区", "带"],
  journey: ["航线", "远征"],
  market: ["市", "集"],
  culture: ["族", "民"],
  religion: ["教会", "教团"],
  biome: ["林", "原"],
  good: ["煤", "铁", "布"],
  regiment: ["团", "舰队"],
  addedLabel: ["区", "站"],
  lore: ["志", "纪"]
} as const;

const WESTERN_MODERN_SUFFIXES = {
  state: ["共和国", "联邦"],
  province: ["省", "区"],
  burg: ["市", "城", "港", "镇"],
  river: ["河", "江"],
  route: ["大道", "公路", "桥"],
  feature: ["山", "湖", "湾"],
  marker: ["市", "港", "站"],
  zone: ["区", "带"],
  journey: ["航线", "之旅"],
  market: ["市", "港市"],
  culture: ["族", "民"],
  religion: ["教会", "教团"],
  biome: ["林", "原"],
  good: ["粮", "盐", "布"],
  regiment: ["团", "舰队"],
  addedLabel: ["市", "区"],
  lore: ["志", "纪"]
} as const;

const CHINESE_CLASSICAL_SUFFIXES = {
  state: ["国", "邦"],
  province: ["州", "郡", "府"],
  burg: ["城", "镇", "关", "驿"],
  river: ["河", "江", "溪", "川"],
  route: ["道", "路", "关", "桥"],
  feature: ["山", "湖", "谷", "林", "峰"],
  marker: ["山", "湖", "台", "亭"],
  zone: ["境", "地", "野"],
  journey: ["行记", "远行"],
  market: ["市", "集"],
  culture: ["族", "民"],
  religion: ["教", "宗"],
  biome: ["林", "野", "原"],
  good: ["米", "盐", "布"],
  regiment: ["军", "营"],
  addedLabel: ["地", "境"],
  lore: ["志", "录"]
} as const;

const CHINESE_EARLY_MODERN_SUFFIXES = {
  state: ["国", "邦", "共和国"],
  province: ["省", "州", "府"],
  burg: ["城", "镇", "港", "关"],
  river: ["江", "河", "渠"],
  route: ["大道", "驿路", "桥"],
  feature: ["山", "湖", "岭"],
  marker: ["港", "城", "关"],
  zone: ["区", "境"],
  journey: ["航路", "行记"],
  market: ["市", "港"],
  culture: ["族", "民"],
  religion: ["教会", "教团"],
  biome: ["林", "原"],
  good: ["米", "盐", "茶"],
  regiment: ["军", "团"],
  addedLabel: ["城", "港"],
  lore: ["志", "录"]
} as const;

const CHINESE_MODERN_SUFFIXES = {
  state: ["共和国", "联邦", "国"],
  province: ["省", "市", "区"],
  burg: ["市", "城", "港", "镇"],
  river: ["江", "河", "渠"],
  route: ["公路", "大道", "桥"],
  feature: ["山", "湖", "湾"],
  marker: ["市", "港", "站"],
  zone: ["区", "带"],
  journey: ["航线", "之行"],
  market: ["市", "港市"],
  culture: ["族", "民"],
  religion: ["教会", "教团"],
  biome: ["林", "原"],
  good: ["粮", "盐", "茶"],
  regiment: ["团", "舰队"],
  addedLabel: ["市", "区"],
  lore: ["志", "录"]
} as const;

const MIXED_SUFFIXES = {
  state: ["王国", "公国", "联邦"],
  province: ["郡", "领", "边区"],
  burg: ["港", "堡", "城", "镇"],
  river: ["河", "溪", "川"],
  route: ["大道", "驿路", "桥"],
  feature: ["山", "湖", "谷", "林"],
  marker: ["关", "港", "峰"],
  zone: ["境", "地"],
  journey: ["之旅", "航路"],
  market: ["市", "港市"],
  culture: ["族", "民"],
  religion: ["教会", "教团"],
  biome: ["林", "原"],
  good: ["盐", "铁", "布"],
  regiment: ["团", "卫队", "舰队"],
  addedLabel: ["地", "境"],
  lore: ["志", "录"]
} as const;

export const CHINESE_NAME_STYLES = [
  {
    id: "western-medieval",
    label: "Western medieval",
    tradition: "western",
    register: "medieval",
    commonCharactersOnly: true,
    hybrid: false,
    words: MEDIEVAL_ROOTS,
    suffixes: WESTERN_MEDIEVAL_SUFFIXES
  },
  {
    id: "western-early-modern",
    label: "Western early modern",
    tradition: "western",
    register: "early-modern",
    commonCharactersOnly: true,
    hybrid: false,
    words: EARLY_MODERN_ROOTS,
    suffixes: WESTERN_EARLY_MODERN_SUFFIXES
  },
  {
    id: "western-industrial",
    label: "Western industrial",
    tradition: "western",
    register: "industrial",
    commonCharactersOnly: true,
    hybrid: false,
    words: INDUSTRIAL_ROOTS,
    suffixes: WESTERN_INDUSTRIAL_SUFFIXES
  },
  {
    id: "western-modern",
    label: "Western modern",
    tradition: "western",
    register: "modern",
    commonCharactersOnly: true,
    hybrid: false,
    words: MODERN_ROOTS,
    suffixes: WESTERN_MODERN_SUFFIXES
  },
  {
    id: "chinese-classical",
    label: "Chinese classical",
    tradition: "chinese",
    register: "medieval",
    commonCharactersOnly: true,
    hybrid: false,
    words: CHINESE_CLASSICAL_ROOTS,
    suffixes: CHINESE_CLASSICAL_SUFFIXES
  },
  {
    id: "chinese-early-modern",
    label: "Chinese early modern",
    tradition: "chinese",
    register: "early-modern",
    commonCharactersOnly: true,
    hybrid: false,
    words: CHINESE_EARLY_MODERN_ROOTS,
    suffixes: CHINESE_EARLY_MODERN_SUFFIXES
  },
  {
    id: "chinese-modern",
    label: "Chinese modern",
    tradition: "chinese",
    register: "modern",
    commonCharactersOnly: true,
    hybrid: false,
    words: CHINESE_MODERN_ROOTS,
    suffixes: CHINESE_MODERN_SUFFIXES
  },
  {
    id: "mixed-chinese-slavic",
    label: "Mixed Chinese and Slavic",
    tradition: "mixed",
    register: "medieval",
    commonCharactersOnly: true,
    hybrid: true,
    words: MIXED_ROOTS,
    suffixes: MIXED_SUFFIXES
  }
] as const satisfies readonly ChineseNameStyle[];

export const DEFAULT_CHINESE_NAME_STYLE_ID: ChineseNameStyleId = "western-medieval";

const STYLE_BY_ID = new Map<string, ChineseNameStyle>(CHINESE_NAME_STYLES.map(style => [style.id, style]));

export function isChineseNameStyleId(value: unknown): value is ChineseNameStyleId {
  return typeof value === "string" && STYLE_BY_ID.has(value);
}

/** Unknown or missing values always fall back to the restrained medieval western style. */
export function resolveChineseNameStyle(value: unknown): ChineseNameStyle {
  return (
    (typeof value === "string" ? STYLE_BY_ID.get(value) : undefined) ?? STYLE_BY_ID.get(DEFAULT_CHINESE_NAME_STYLE_ID)!
  );
}
