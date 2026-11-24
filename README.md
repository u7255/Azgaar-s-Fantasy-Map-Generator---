# Fantasy Map Generator 深度汉化版

基于 [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator)
官方 `1.157.0` 的社区简体中文版本。当前发布版本为 **v1.0.5**。

本项目提供完整源码、Windows x64 与 Windows arm64 安装包。软件免费、开源，无收费或 VIP 限制。

## 下载

前往 [v1.0.5 Release](https://github.com/u7255/Azgaar-s-Fantasy-Map-Generator---/releases/tag/v1.0.5) 下载：

- Windows x64：`fmg-zh-CN-1.157.0-win-x64.exe`
- Windows arm64：`fmg-zh-CN-1.157.0-win-arm64.exe`
- 校验文件：`SHA256SUMS.txt`

`latest.yml` 和 `*.blockmap` 供应用内更新使用，通常不需要手动下载。

安装包当前没有 Authenticode 代码签名。Windows SmartScreen 可能提示“未知发布者”，请在运行前核对 `SHA256SUMS.txt`。

## v1.0.5 更新

本次更新集中处理地图名称质量、中文覆盖和编辑器显示：

- 国家、省份、城镇、河流、道路的编辑器、概览、标题、关联字段和 CSV 支持中文显示。
- 中文显示名与原文名分开保存，中文修改不会覆盖源名称、ID、seed 或生成数据。
- 源名称变化后，旧中文名会标记为过期，避免继续使用失真的译名。
- 新增西幻中世纪、西幻近代、西幻现代、中式古典、中式近代、中式现代和中西混合等命名风格入口。
- 长名可按完整词根或音节块压缩；超过软目标会提示，超过硬上限可阻止批量应用。
- 官方 `1.157.0` 打开并再次保存后，实体级中文名称和命名风格记录仍可保留。

## 中文版内容

- 简体中文界面、菜单、提示和退出确认。
- 中文名称持久化，支持与官方 `1.157.0` 地图互相打开。
- 国家、省份、城镇、河流、道路、地物、标记、区域、旅程等实体的中文名称。
- 中文、全拼、首字母和别名搜索。
- 深度本地化面板、名称审核和用户覆盖。
- 小说地名志导出，支持 Markdown、CSV 和 JSON。
- 四套本地中文字体，不依赖在线字体。
- 长中文标签自动适配，减少截断和重叠。
- 桌面窗口大小、最大化和全屏状态记忆。

地图中的原始名称、ID、seed 和生成数据保持不变。中文名称作为扩展字段保存，不破坏官方格式。

## 从源码运行

要求 Node.js 24 或更高版本。

```powershell
git clone https://github.com/u7255/Azgaar-s-Fantasy-Map-Generator---.git
cd Azgaar-s-Fantasy-Map-Generator---
npm ci
npm run build
npm run electron -- build
```

开发模式：

```powershell
npm run electron
```

## 构建 Windows 安装包

```powershell
npm run electron -- dist --win --publish never
```

产物输出到 `release/`。

## 测试

```powershell
npm test -- --run
npm run test:e2e -- --reporter=line
npm run test:electron
npm run test:electron-window
```

Windows 环境下，全量 Vitest 仍有 3 个与上游路径和 Canvas 环境有关的既有失败。Electron 测试、桌面窗口测试和完整 E2E 已通过。

## 已知限制

- 官方 `1.157.0` 打开并再次保存地图时，可能丢弃地图级的 `options.map.localization`，再次用本版打开后会回退默认命名风格。实体级中文名称不受影响。
- 安装包未签名，Windows SmartScreen 可能提示未知发布者。

## 上游与许可证

- 上游项目：<https://github.com/Azgaar/Fantasy-Map-Generator>
- 上游版本：`v1.157.0`
- 许可证：MIT

本仓库保留上游版权声明和许可证。提交问题时请注明使用版本、操作系统、复现步骤和相关地图文件。
