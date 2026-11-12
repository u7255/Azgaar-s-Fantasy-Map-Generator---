# T06 深度本地化界面与搜索

日期：2026-11-11

状态：实现和验证完成，停在 CP3/T06；未开始 T08、T09 或最终打包。

## 1. 分支与提交

- 分支：`feat/zh-deep-localization-ui`
- 基线：`9c6b80ac`
- `e0234e3a` `feat(localization): add bilingual display mode`
- `d315d05f` `feat(localization): add name review store`
- `f05cf7d3` `feat(localization): add deep localization panel`
- `2310aa39` `feat(search): index localized names with pinyin`
- `6d985eda` `test(localization): verify deep localization at narrow width`

## 2. 显示模式

- 稳定模式为 `source`、`zh`、`bilingual`，默认 `zh`。
- 双语格式固定为 `中文 · 原文`。
- 规范化后重复的中英文只保留一次；原文已包含中文时不再重复追加。
- `source` 完全绕过中文槽和中文地图字体。
- `zh` 与 `bilingual` 使用 T07 离线字体解析，切回原文恢复原字体。

## 3. 审核面板

顶部菜单新增“深度本地化”入口，面板覆盖 T04 第一批 10 类实体：

`state`、`province`、`burg`、`river`、`route`、`feature`、`marker`、`zone`、`journey`、`addedLabel`。

面板提供：

- 总数、已确认、预览、过期、冲突、无建议统计。
- 全量、过期、冲突、无建议筛选。
- 状态、当前显示、原文、建议和逐项操作。
- 单条接受、编辑、重新生成和清空。
- 每页 50 行，避免大地图一次渲染数千行。
- 四套中文字图字体选择和重绘；3D 激活时请求 3D 重绘。
- 小说地名志入口保持显式但禁用，未实现 T09。

槽位语义：

- 自动生成和单条重新生成只写 `zhPreview`，状态为 `preview`。
- 单条接受或批量应用后写 `zh`，状态为 `confirmed`。
- 人工编辑写 `zhOverride`，来源为 `user`。
- 清空只移除三个中文槽，未知扩展字段保留。
- 批量应用跳过冲突和过期行，不自动确认它们。
- 批量撤销保存受影响实体的会话内 `localizedNames` 快照；地图更换或重载后失效。

## 4. Omnibar 搜索

新增依赖 `pinyin-pro@3.29.5`，索引以下输入：

| 输入 | 示例 |
| --- | --- |
| 中文显示名 | `西境` |
| 英文原名或全名 | `Westreach`、`Kingdom of Westreach` |
| 全拼，带空格或无空格 | `xi jing`、`xijing` |
| 拼音首字母 | `xj` |
| 中文别名 | `西域` |
| 跨实体重名提示 | `重名提示：Burg · ...` |

搜索按原名、全拼、首字母、别名、上下文和备注分层计分。结果详情会标出共享同一中文显示名的实体。

## 5. 真实浏览器证据

480x800 Chromium 实际运行并写出：

```text
viewportWidth     480
documentWidth     480
panelClientWidth  460
panelScrollWidth  460
dialogLeft          9
dialogRight       471
rowOverflow      false
```

证据：

- `.cache/t06/narrow-viewport.json`
- `.cache/t06/is-operable-at-480px-with-batch-previews,-undo-and-no-horizontal-overflow.png`

本地 Playwright 用例执行到窄屏断言完成，但测试进程在退出阶段挂起；未修改的既有 `controller-launchers.spec.ts` 在本机也会出现相同退出挂起，因此没有把它误报成 T06 回归。

## 6. 自动验证

通过：

- T06 目标单测：7 个文件，139/139。
- `label-groups.dom.test.ts` 浏览器测试：2/2。
- `npm run build`。
- `npm run electron -- build`。
- `npm run test:electron`：9/9。
- `npm run test:scripts`：70/70。
- `npm run lint-locales`。
- `git diff --check`。
- `git diff 9c6b80ac..HEAD --check`。

全量测试：

```text
2 failed files
3 failed tests
2839 passed
```

三个失败仍是已知 Windows 基线：`icon-sets` 两项和 Assistant 上下文生成器一项。

## 7. 风险与边界

- `pinyin-pro` 进入懒加载 Omnibar 包，构建后的 Omnibar chunk 约 303 kB；不增加首屏主包。
- 大地图审核默认只渲染当前 50 行，统计和批量操作仍覆盖全量实体。
- 自动音译自然度仍受 T05 词典质量限制；本任务只提供审校和人工覆盖入口。
- 未实现 T08 的 religion、culture、good、market、regiment 等扩展实体。
- 未实现 T09 小说地名志导出。
- 未运行 Windows 安装器打包。

## 8. 下一入口

停在 CP3/T06。统筹验收后，下一允许任务应由统筹独立派发；本执行对话不进入 T08、T09 或 T11。
