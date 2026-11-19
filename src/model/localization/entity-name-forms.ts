const LOCALIZED_FORM_NAMES: Record<string, string> = {
  Area: "区域",
  Autonomy: "自治领",
  Barony: "男爵领",
  Beylik: "贝伊国",
  Bishopric: "主教区",
  Caliphate: "哈里发国",
  Canton: "州",
  Captaincy: "总督领",
  Chiefdom: "酋长国",
  "City-state": "城邦",
  Colony: "殖民地",
  Commonwealth: "联邦",
  County: "郡",
  Department: "省",
  Dependency: "属地",
  Despotate: "专制国",
  Diocese: "教区",
  District: "区",
  Dominion: "自治领",
  Duchy: "公国",
  Earldom: "伯爵领",
  Emirate: "埃米尔国",
  Empire: "帝国",
  Federation: "联邦",
  "Free City": "自由市",
  "Grand Duchy": "大公国",
  Governorate: "总督区",
  Horde: "汗国",
  Khanate: "汗国",
  Kingdom: "王国",
  Land: "领",
  "Most Serene Republic": "尊贵共和国",
  Principality: "亲王国",
  Protectorate: "保护国",
  Province: "省",
  Republic: "共和国",
  Shire: "郡",
  State: "州",
  Sultanate: "苏丹国",
  Territory: "领地",
  Theocracy: "神权国",
  Tribe: "部落",
  Union: "联盟"
};

/** Display a stored English form name in Chinese without changing the map value */
export function localizeFormName(formName: unknown): string {
  if (typeof formName !== "string") return "";
  const value = formName.trim();
  return LOCALIZED_FORM_NAMES[value] ?? value;
}
