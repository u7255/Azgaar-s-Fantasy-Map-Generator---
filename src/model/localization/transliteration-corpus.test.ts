import { describe, expect, it } from "vitest";
import { suggestChineseName } from "./transliteration-engine";

const POLITICAL_NAMES = [
  ["Kingdom of Aldoria", "阿尔多里亚王国"],
  ["Republic of Ardenia", "阿登尼亚共和国"],
  ["Empire of Aymar", "艾马尔帝国"],
  ["Grand Duchy of Aldoria", "阿尔多里亚大公国"],
  ["Duchy of Aymar", "艾马尔公国"],
  ["Principality of Ardenia", "阿登尼亚亲王国"],
  ["Theocracy of Aymar", "艾马尔神权国"],
  ["Free City of Aymar", "艾马尔自由市"],
  ["Imperial City of Ardenia", "阿登尼亚帝国自由市"],
  ["High Kingdom of Aldoria", "阿尔多里亚至高王国"],
  ["Sultanate of Aldoria", "阿尔多里亚苏丹国"],
  ["Khanate of Ardenia", "阿登尼亚汗国"],
  ["Tsardom of Aymar", "艾马尔沙皇国"],
  ["Commonwealth of Aldoria", "阿尔多里亚联邦"],
  ["Confederacy of Ardenia", "阿登尼亚邦联"],
  ["Federation of Aymar", "艾马尔联邦"],
  ["Dominion of Aldoria", "阿尔多里亚自治领"],
  ["Colony of Ardenia", "阿登尼亚殖民地"],
  ["Province of Aymar", "艾马尔省"],
  ["March of Ardenia", "阿登尼亚边区"],
  ["County of Ravenshire", "渡鸦郡"],
  ["Barony of Aymar", "艾马尔男爵领"],
  ["Viscounty of Aldoria", "阿尔多里亚子爵领"],
  ["Dukedom of Ardenia", "阿登尼亚公国"],
  ["Earldom of Aymar", "艾马尔伯爵领"],
  ["Realm of Ardenia", "阿登尼亚王国"],
  ["Territory of Aymar", "艾马尔领地"],
  ["City-State of Aldoria", "阿尔多里亚城邦"],
  ["Tribal Confederacy of Ardenia", "阿登尼亚部落邦联"],
  ["Crownland of Aymar", "艾马尔王领"],
  ["Archduchy of Aldoria", "阿尔多里亚大公国"],
  ["Caliphate of Ardenia", "阿登尼亚哈里发国"],
  ["Emirate of Aymar", "艾马尔酋长国"]
] as const;

const RIVER_NAMES = [
  ["Vel River", "维尔河"],
  ["River of Kings", "国王河"],
  ["Alder River", "赤杨河"],
  ["Blackwater River", "黑水河"],
  ["Frost River", "霜河"],
  ["Silver River", "银河"],
  ["Storm River", "风暴河"],
  ["Moon River", "月河"],
  ["White River", "白河"],
  ["Shadow River", "影河"],
  ["Wolf River", "狼河"],
  ["Dragon River", "龙河"],
  ["Thorn River", "荆棘河"],
  ["Amber River", "琥珀河"],
  ["Crystal River", "晶河"],
  ["Iron River", "铁河"],
  ["Gold River", "金河"],
  ["Ash River", "灰河"],
  ["Snow River", "雪河"],
  ["Sun River", "日河"],
  ["Star River", "星河"],
  ["Fire River", "火河"],
  ["Blue River", "蓝河"],
  ["Green River", "绿河"]
] as const;

const WATER_NAMES = [
  ["Sea of Storms", "风暴海"],
  ["Sea of Shadows", "影海"],
  ["Sea of Whispers", "低语海"],
  ["Sea of Tears", "泪海"],
  ["Sea of Mist", "雾海"],
  ["Sea of Flames", "焰海"],
  ["Sea of Ice", "冰海"],
  ["Sea of Glass", "琉璃海"],
  ["North Sea", "北海"],
  ["South Sea", "南海"],
  ["East Sea", "东海"],
  ["West Sea", "西海"],
  ["Black Sea", "黑海"],
  ["White Sea", "白海"],
  ["Red Sea", "红海"],
  ["The Azure Ocean", "蔚蓝洋"],
  ["Ocean of Storms", "风暴洋"],
  ["Ocean of Tears", "泪洋"],
  ["Ocean of Shadows", "影洋"],
  ["Mirror Lake", "镜湖"],
  ["Silver Lake", "银湖"],
  ["Black Lake", "黑湖"],
  ["Moon Lake", "月湖"],
  ["Lake Mirror", "镜湖"],
  ["Bay of Whispers", "低语湾"],
  ["Bay of Tears", "泪湾"],
  ["Bay of Storms", "风暴湾"],
  ["Black Bay", "黑湾"],
  ["Moon Bay", "月湾"],
  ["Isle of Mists", "雾岛"],
  ["Island of Whispers", "低语岛"],
  ["Island of Shadows", "影岛"],
  ["Silver Island", "银岛"],
  ["Emerald Island", "翠岛"],
  ["Frost Island", "霜岛"],
  ["Dragon Isle", "龙岛"],
  ["Isles of Mist", "雾群岛"],
  ["Isles of Storms", "风暴群岛"]
] as const;

const LAND_NAMES = [
  ["Mount Doom", "末日山"],
  ["Mount Silence", "寂静山"],
  ["Mount Storm", "风暴山"],
  ["Mount Frost", "霜山"],
  ["Fire Mountain", "火山"],
  ["White Mountain", "白山"],
  ["Storm Mountains", "风暴山脉"],
  ["White Mountains", "白山脉"],
  ["Dragon Peak", "龙峰"],
  ["Wolf Peak", "狼峰"],
  ["Frost Valley", "霜谷"],
  ["Shadow Vale", "影谷"],
  ["Storm Pass", "风暴关隘"],
  ["Thorn Forest", "荆棘森林"],
  ["Shadow Forest", "影森林"],
  ["Black Forest", "黑森林"],
  ["Silver Forest", "银森林"],
  ["Forest of Shadows", "影森林"],
  ["Sun Desert", "日沙漠"],
  ["White Glacier", "白冰川"],
  ["Mist Highlands", "雾高地"],
  ["Salt Marsh", "盐沼泽"],
  ["Moon Valley", "月谷"],
  ["Crystal Falls", "晶瀑布"],
  ["Iron Hills", "铁丘"]
] as const;

const COMPOUND_NAMES = [
  ["King's Road", "国王大道"],
  ["Raven's Hold", "鸦堡"],
  ["Silver-Run", "银奔流"],
  ["Stonegate", "石门"],
  ["Ironbridge", "铁桥"],
  ["Northwatch", "北望"],
  ["Stormwind", "风暴风"],
  ["Blackwater", "黑水"],
  ["Silverwood", "银林"],
  ["Frostvale", "霜谷"],
  ["Ravenhold", "鸦堡"],
  ["Stonehaven", "石港"],
  ["Dragonstone", "龙石"],
  ["Wolfwood", "狼林"],
  ["Starfall", "星落"],
  ["Stormwatch", "风暴望"],
  ["Brightwater", "明水"],
  ["Duskwood", "暮林"],
  ["Frostbridge", "霜桥"],
  ["Moonwater", "月水"],
  ["Ironwood", "铁林"],
  ["Stonebridge", "石桥"],
  ["Goldvale", "金谷"]
] as const;

const BOUNDARY_NAMES = [
  ["Aymar", "艾马尔"],
  ["Aldoria", "阿尔多里亚"],
  ["Ardenia", "阿登尼亚"],
  ["Valcaia", "瓦尔卡亚"],
  ["Brocelande", "布罗瑟兰德"],
  ["Vel", "维尔"],
  ["阿尔多里亚", "阿尔多里亚"],
  ["Ｋｉｎｇｄｏｍ ｏｆ Ａｌｄｏｒｉａ", "阿尔多里亚王国"],
  ["  Sea   of   Storms  ", "风暴海"],
  ["Raven’s Hold", "鸦堡"],
  ["MOUNT DOOM", "末日山"],
  ["X", "克斯"],
  ["Thorn's Reach", "荆棘境"],
  ["Kingdom of the White Mountains", "白山脉王国"],
  ["Aymar   Theocracy", "艾马尔神权国"],
  ["Vel river", "维尔河"]
] as const;

const NAME_CORPUS = [
  ...POLITICAL_NAMES,
  ...RIVER_NAMES,
  ...WATER_NAMES,
  ...LAND_NAMES,
  ...COMPOUND_NAMES,
  ...BOUNDARY_NAMES
] as const;

describe("T05 name corpus", () => {
  it("contains at least 100 unique test names", () => {
    expect(NAME_CORPUS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(NAME_CORPUS.map(([source]) => source)).size).toBe(NAME_CORPUS.length);
  });

  it.each(NAME_CORPUS)("suggests %s as %s", (source, expected) => {
    const first = suggestChineseName(source);
    const second = suggestChineseName(source);

    expect(first.text).toBe(expected);
    expect(first.text).toMatch(/^[\p{Script=Han}]+$/u);
    expect(first).toEqual(second);
  });

  it("covers every required semantic group", () => {
    expect(POLITICAL_NAMES.length).toBeGreaterThanOrEqual(30);
    expect(RIVER_NAMES.length).toBeGreaterThanOrEqual(20);
    expect(WATER_NAMES.length).toBeGreaterThanOrEqual(30);
    expect(LAND_NAMES.length).toBeGreaterThanOrEqual(20);
    expect(COMPOUND_NAMES.length).toBeGreaterThanOrEqual(20);
    expect(BOUNDARY_NAMES.length).toBeGreaterThanOrEqual(15);
  });
});
