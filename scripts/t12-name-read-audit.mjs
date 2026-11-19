import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const NAME_READ_PATTERN = /\.name\b|\.fullName\b|\.label\.text\b|\.label\?\.text\b/g;

export const AUDIT_CATEGORIES = {
  integrated: "已接入中文显示层",
  source: "有意沿用源名称",
  nonName: "非名称显示",
  followUp: "后续任务"
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCOPES = ["src", "electron"];
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const UI_SCOPES = ["src/controllers/", "src/ui/", "src/renderers/"];

const INTEGRATION_MARKERS = [
  "MapEntities.getName",
  "MapEntities.getNameParts",
  "MapEntities.getNameState",
  "resolveEntityDisplayName",
  "resolveLoreDisplayName",
  "currentEntityName",
  "renderEntityNameCell",
  "renderLocalizedNameCell",
  "localizedNameCsv",
  "Markets.getName",
  "Goods.getName",
  "Rivers.getName",
  "Features.getName",
  "Military.getName",
  "Lore.getName"
];

const SOURCE_INTENT_MARKERS = [
  ".rename(",
  "setFullName(",
  "setForm(",
  "setDefaultMarkerName(",
  "refreshEntityLocalizedNames",
  "sourceName",
  "sourceFullName",
  "sourceFields",
  "oldFullName",
  "newName",
  "renameToSame",
  "row.apply(",
  "Routes.generateName",
  "Names.getState",
  ".name =",
  ".fullName ="
];

const NON_NAME_MARKERS = [
  "querySelector",
  "classList",
  "className",
  "data-name",
  "dataset.name",
  "input.name",
  "button.name",
  "target.name",
  "attribute.name",
  "file.name",
  "error.name",
  "constructor.name",
  "command.name",
  "unit.name",
  "newType.name",
  "type.name",
  "option.name",
  "group.name",
  "rule.name",
  "transport.name",
  "call.name",
  "tool.name",
  "item.name",
  "legend.name",
  "preset.name",
  "battle.name",
  "note.name",
  "dataElement.name",
  "Icons.name",
  "Names.nameBases",
  "options.map.military.units",
  "options.map.labels.groups",
  "styles.labels.groups",
  "getFileName("
];

const ENTITY_RECEIVER =
  /\b(?:pack\.(?:states|provinces|burgs|rivers|routes|features|zones|journeys|markets|addedLabels|cultures|religions|biomes|markers|goods)|state|province|burg|river|route|feature|zone|journey|segment|market|regiment|marker|culture|religion|biome|good|entity|objectState|currentEl|editedGood|node\.good|row\.state|d\.data|parent\.data|s|p|b|r|c|m|j|reg)\??(?:\[[^\]]+\])?\.(?:name|fullName)\b/;

const CENTRAL_BOUNDARY_FILES = new Set([
  "src/model/map-entities.ts",
  "src/model/localization/entity-display-name.ts",
  "src/model/localization/localized-names.ts",
  "src/model/localization/name-review.ts",
  "src/model/localization/novel-gazetteer.ts",
  "src/model/localization/transliteration-engine.ts",
  "src/ui/entity-name.ts",
  "src/renderers/labels/label-data.ts",
  "src/renderers/labels/fit-state-label.ts",
  "src/renderers/view-3d-renderer.ts"
]);

const FOLLOW_UP_FILES = new Set([
  "src/controllers/cell-info.ts",
  "src/controllers/economy/entities/economy-overview.ts",
  "src/controllers/economy/goods/good-editor.ts",
  "src/controllers/economy/goods/goods-editor.ts",
  "src/controllers/economy/goods/goods-distribution-editor.ts",
  "src/controllers/economy/goods/production-chains.ts",
  "src/controllers/economy/markets/market-overview.ts",
  "src/controllers/economy/markets/market-deals-overview.ts",
  "src/controllers/economy/markets/markets-overview.ts",
  "src/controllers/economy/trade/trade-details.ts",
  "src/controllers/political/burgs/burgs-overview.ts",
  "src/controllers/political/diplomacy-overview.ts",
  "src/controllers/political/emblems/emblems-editor.ts",
  "src/controllers/political/military/battle-screen.ts",
  "src/controllers/political/military/military-overview.ts",
  "src/controllers/political/military/regiments-overview.ts",
  "src/controllers/political/stability-overview.ts",
  "src/controllers/story/journeys/journey-editor.ts",
  "src/controllers/story/markers/markers-in-radius.ts",
  "src/controllers/story/markers/markers-overview.ts",
  "src/ui/dialog/limitation-picker.ts"
]);

const SOURCE_DISPLAY_FILES = new Set([
  "src/controllers/assistant/proposals.ts",
  "src/controllers/omnibar.ts",
  "src/controllers/political/provinces-editor.ts",
  "src/controllers/political/states-editor.ts",
  "src/model/options/options-model.ts",
  "src/model/options/options-schema.ts",
  "src/services/io/auto-update.ts",
  "src/services/io/export.ts",
  "src/services/io/export-json.ts",
  "src/services/io/save.ts",
  "src/services/url-params.ts"
]);

const NON_NAME_FILES = new Set(["src/controllers/paint-editor.ts"]);

function normalizePath(path) {
  return path.split(sep).join("/");
}

function sourceFiles(root) {
  return SCOPES.flatMap(scope =>
    readdirSync(join(root, scope), { recursive: true })
      .map(path => normalizePath(join(scope, path)))
      .filter(path => SOURCE_EXTENSIONS.some(extension => path.endsWith(extension)))
      .sort()
  );
}

function isTestFile(path) {
  return /\.(?:test|dom\.test)\.tsx?$/.test(path) || path.includes("/tests/");
}

function isUiFile(path) {
  return UI_SCOPES.some(scope => path.startsWith(scope)) && !isTestFile(path);
}

function hasEntityNameRead(line, property) {
  if (property === ".fullName" || property.startsWith(".label")) return true;
  return ENTITY_RECEIVER.test(line);
}

function lineClassification(path, line, property, context) {
  if (isTestFile(path)) {
    return {
      category: "nonName",
      reason: "测试断言或测试夹具，不进入运行时 UI"
    };
  }

  if (CENTRAL_BOUNDARY_FILES.has(path)) {
    return {
      category: "integrated",
      reason: "中央名称适配层或已明确接入统一显示层的渲染入口"
    };
  }

  if (INTEGRATION_MARKERS.some(marker => line.includes(marker))) {
    return {
      category: "integrated",
      reason: "该读取用于统一名称接口、中文列或已接入的显示转换"
    };
  }

  if (
    /(?:download|export|upload|search|filter)/i.test(context) &&
    !INTEGRATION_MARKERS.some(marker => line.includes(marker))
  ) {
    return {
      category: "source",
      reason: "搜索别名、筛选兼容或导出源名称，属于有意保留的源字段"
    };
  }

  if (SOURCE_INTENT_MARKERS.some(marker => line.includes(marker))) {
    return {
      category: "source",
      reason: "源名称编辑、重命名、stale 关联或序列化边界"
    };
  }

  if (NON_NAME_FILES.has(path) || NON_NAME_MARKERS.some(marker => line.includes(marker))) {
    return {
      category: "nonName",
      reason: "CSS、DOM、文件、工具、单位或非实体名称字段"
    };
  }

  if (FOLLOW_UP_FILES.has(path)) {
    return {
      category: "followUp",
      reason: "用户可见实体名称仍直接读取源字段，尚未统一接入中文显示层"
    };
  }

  if (SOURCE_DISPLAY_FILES.has(path)) {
    return {
      category: "source",
      reason: "有意保留源名称：编辑原文、搜索别名、导入导出或官方兼容字段"
    };
  }

  if (isUiFile(path) && hasEntityNameRead(line, property)) {
    return {
      category: "followUp",
      reason: "UI 文件中的实体名称直读需要后续确认或接入"
    };
  }

  if (isUiFile(path)) {
    return {
      category: "nonName",
      reason: "UI 文件中的 CSS、DOM、选项、单位或工具元数据读取"
    };
  }

  return {
    category: "nonName",
    reason: "模型、生成器、服务或基础设施数据读取，不是运行时名称显示"
  };
}

function enclosingFunction(lines, index) {
  for (let cursor = index; cursor >= 0; cursor--) {
    const match =
      lines[cursor].match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/) ??
      lines[cursor].match(/^\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/) ??
      lines[cursor].match(/^\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/);
    if (match) return match[1];
  }
  return "";
}

function matchReceiver(line, matchIndex) {
  const before = line.slice(0, matchIndex).trimEnd();
  const receiver = before.match(/([A-Za-z_$][\w$]*(?:\?\.)?(?:\[[^\]]+\])?(?:\.[A-Za-z_$][\w$]*)*)$/)?.[1];
  return receiver ?? "";
}

export function auditNameReads(root = ROOT) {
  const entries = [];

  for (const path of sourceFiles(root)) {
    const text = readFileSync(join(root, path), "utf8");
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const context = enclosingFunction(lines, index);
      for (const match of line.matchAll(NAME_READ_PATTERN)) {
        const classification = lineClassification(path, line, match[0], context);
        entries.push({
          path,
          line: index + 1,
          property: match[0],
          receiver: matchReceiver(line, match.index ?? 0),
          code: line.trim(),
          ...classification
        });
      }
    }
  }

  const counts = Object.fromEntries(Object.keys(AUDIT_CATEGORIES).map(category => [category, 0]));
  const fileCounts = new Map();
  for (const entry of entries) {
    counts[entry.category]++;
    const file = fileCounts.get(entry.path) ?? {
      path: entry.path,
      total: 0,
      categories: Object.fromEntries(Object.keys(AUDIT_CATEGORIES).map(category => [category, 0]))
    };
    file.total++;
    file.categories[entry.category]++;
    fileCounts.set(entry.path, file);
  }

  return {
    scope: {
      roots: SCOPES,
      extensions: SOURCE_EXTENSIONS,
      patterns: [".name", ".fullName", ".label.text", ".label?.text"],
      includesTests: true
    },
    counts,
    total: entries.length,
    files: [...fileCounts.values()].sort((a, b) => a.path.localeCompare(b.path)),
    entries
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = auditNameReads();
  console.log(JSON.stringify(report, null, 2));
}
