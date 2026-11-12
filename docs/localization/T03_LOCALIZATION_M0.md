# T03 地名本地化 M0 兼容性结论

日期：2026-11-11

状态：T03 已通过统筹验收并快进合并。未进入 T04。

## 结论

通过。单个州实体上的 `localizedNames.zh` 扩展字段可以：

- 由当前项目保存和重新加载。
- 由官方 `Fantasy Map Generator 1.157.0` 实际打开并再次保存。
- 在官方保存后由当前项目重新加载。
- 保持地图标题、全量实体名称、标签、种子和代表性生成数据不变。

本地 WOFF2 中文子集可以离线加载，并用于 SVG 标签、SVG data URI 内嵌和实际 PNG 栅格导出。

不需要增加顶层 `.map` 数组位置，也没有新增 `.map` 记录。

## 测试范围

- 基线来源：`tests/fixtures/1.154.0.map`。
- 该夹具由当前项目打开、迁移并真实保存为 1.157.0 基线。
- 只给 state 1 增加扩展字段。
- state 1 原始值：
  - `name`: `Aymar`
  - `fullName`: `Aymar Theocracy`
  - `label.text`: `Aymar |Theocracy`
- 地图标题：`settings.lore.name = Valcaia`
- 种子：`633769215`
- 扩展字段：

```json
{
  "localizedNames": {
    "zh": {
      "text": "阿尔多里亚",
      "sourceName": "Aymar",
      "sourceHash": "1d4d21c9edc3930e",
      "source": "manual"
    }
  }
}
```

## 七项实测

| 要求 | 结果 |
| --- | --- |
| 1. 写入扩展字段 | 通过，只修改 state 1 |
| 2. 保存 `.map` 后字段仍在 | 通过，`01-injected.map` 可读取 |
| 3. 本项目重新加载 | 通过，`02-project-reloaded.map` 保留字段 |
| 4. 官方 1.157.0 打开并再次保存 | 通过，使用官方自身 `Save.toMachine()` |
| 5. 官方保存后本项目加载 | 通过，`05-project-final.map` 保留字段 |
| 6. 原名与生成数据不变 | 通过，地图标题、全量名称、全量标签、种子和 8 类摘要全部相等 |
| 7. 字体 SVG/PNG | 通过，离线 FontFace、SVG data URI 和 PNG 像素差均有断言 |

## 地图往返证据

所有地图均为 56 个顶层记录，扩展字段始终位于记录 14 的 state 1：

| 文件 | 字节 | 记录数 | 扩展字段 |
| --- | ---: | ---: | --- |
| `00-baseline.map` | 3,603,700 | 56 | 无 |
| `01-injected.map` | 3,603,822 | 56 | 保留 |
| `02-project-reloaded.map` | 3,603,822 | 56 | 保留 |
| `03-official-input.map` | 3,603,822 | 56 | 保留 |
| `04-official-saved.map` | 3,599,614 | 56 | 保留 |
| `05-project-final.map` | 3,603,822 | 56 | 保留 |

基线、项目重载、官方保存和最终重载的以下摘要全部相等：

- `version`
- `seed`
- `graph.width`
- `graph.height`
- `settings.lore.name`，实际值 `Valcaia`
- 全量实体名称指纹
- 全量实体标签指纹
- state `name`
- state `fullName`
- state `label.text`
- state generated fields hash
- grid hash
- features hash
- cultures hash
- burgs hash
- burg cell assignment hash
- culture cell assignment hash
- state cell assignment hash

完整值保存在未提交的 `.cache/t03-localization-m0/report.json`。

### 全量名称

名称指纹扫描所有 JSON 数组实体，只纳入实际存在的 `name`、`fullName` 和 `formName` 字符串。计算前递归移除 `localizedNames`。

实际覆盖 1,344 个实体：

| 记录 | 类型 | 实体数 |
| --- | --- | ---: |
| 3 | biomes | 14 |
| 12 | features | 18 |
| 13 | cultures | 20 |
| 14 | states | 101 |
| 15 | burgs | 596 |
| 29 | religions | 33 |
| 30 | provinces | 228 |
| 32 | rivers | 217 |
| 35 | markers | 96 |
| 37 | routes | 13 |
| 38 | zones | 8 |

字段计数：

- `name`: 1,344
- `fullName`: 328
- `formName`: 328

SHA256：

```text
f68d33228b65c1c6611f90668b5cebae96163526bd6a15333bd7c28959d989be
```

### 全量标签

标签指纹扫描上述实体上的 `label.text`，并扫描记录 47 的 `addedLabels.label.text`。计算前同样移除 `localizedNames`。

实际结果：

- 标签总数：52
- `states`: 52
- `addedLabels`: 0

这张迁移地图没有 added labels，但记录 47 仍被显式扫描；纯函数测试使用非空 `addedLabels.label.text` 验证了该路径。

SHA256：

```text
13fd21739584da8074931fa60bdc5639cfa901188e138c7d13796246557eb140
```

## 字体证据

来源：

- npm 包：`@fontsource/noto-sans-sc@5.3.1`
- 文件：`noto-sans-sc-chinese-simplified-400-normal.woff2`
- 字体族：Noto Sans SC
- 许可证：SIL Open Font License 1.1
- 字数：1,142,552 bytes
- SHA256：`95e3633b6a98f764ba3adfb54504a0cd4799328c009adf9081d6c1850f9c4c78`

字体文件只放在项目忽略缓存中，没有提交进仓库，也没有成为运行时依赖。

实测：

- `FontFace.status`: `loaded`
- `document.fonts.check`: `true`
- SVG 包含匹配的 `@font-face`
- SVG 包含 `data:font/woff2;base64`
- SVG 包含测试文本 `阿尔多里亚`
- PNG 中显示/隐藏标签差异：17,416 pixels
- PNG 中目标字体/回退字体差异：16,177 pixels
- PNG 文件：94,331 bytes
- SVG 文件：3,223,952 bytes

证据文件：

```text
.cache/t03-localization-m0/t03-font-proof.svg
.cache/t03-localization-m0/t03-font-proof.png
.cache/t03-localization-m0/report.json
```

## 复现

纯函数测试：

```powershell
node --test scripts/t03-localization-spike-lib.test.mjs
npm run test:scripts
```

端到端验证需要本机安装浏览器、官方 1.157.0 和本地 WOFF2：

```powershell
node scripts/t03-localization-spike.mjs `
  --browser <chromium-browser.exe> `
  --official-app <official-1.157.0.exe> `
  --woff2 <noto-sans-sc-subset.woff2> `
  --input-map tests/fixtures/1.154.0.map `
  --output .cache/t03-localization-m0
```

脚本通过当前项目和官方应用自身的 `Save.toMachine()` 截获真实保存结果，不手工拼装最终 `.map`。

## 验证记录

- `node --test scripts/t03-localization-spike-lib.test.mjs`：3/3 通过。
- `npm run test:scripts`：68/68 通过。
- `npm run build`：通过。
- `npm run electron -- build`：通过。
- `npm run lint-locales`：通过。
- `git diff --check`：通过。
- 全量测试：已知 3 个 Windows 路径/Assistant 上下文基线失败，2,551 项通过。

## 对 T04 的建议

1. 将 `localizedNames` 作为实体级可选扩展字段，继续放在 state、burg 等现有实体中。
2. 初期保留 `zh.text`、`sourceName`、`sourceHash` 和 `source` 四个字段。
3. 把 `sourceHash` 定义为规范化源名称的稳定哈希，用于 T04 的过期检测。
4. 加载时容忍字段缺失或结构不完整，不让旧地图失败。
5. 正式模型应覆盖 state、burg、river、culture、religion、province 等实体，但不要改变顶层 `.map` 记录协议。
6. 字体注册和导出可沿用本次 data URI 路径；生产实现再加入授权、字体名称和 fallback 校验。

## 风险

- M0 只验证了一个 state 实体，不证明所有实体类型都会保留扩展字段。
- 官方 1.157.0 当前保留未知 JSON 字段，但未来版本可能改变迁移策略。
- 本次只验证 SVG/PNG，不代表四套正式字体的排版、授权和包体已经确定。
- 未实现显示解析、默认中文、过期检测、人工覆盖 UI 或搜索，这些属于 T04 及后续任务。
