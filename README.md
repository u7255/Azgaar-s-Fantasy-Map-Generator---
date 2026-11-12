# Fantasy Map Generator 简体中文版

基于 [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator)
`v1.157.0` 的社区简体中文版本。当前发布版本为 **1.157.0**。

本项目提供完整源码、Windows x64 与 Windows arm64 安装包。软件免费、开源，无收费或 VIP 限制。

## 下载

前往 [Releases](https://github.com/u7255/Azgaar-s-Fantasy-Map-Generator---/releases/tag/v1.157.0) 下载：

- Windows x64：`fmg-zh-CN-1.157.0-win-x64.exe`
- Windows arm64：`fmg-zh-CN-1.157.0-win-arm64.exe`
- 自动更新清单：`latest.yml`
- 增量更新文件：对应的 `*.blockmap`
- 校验值：`SHA256SUMS.txt`

### SHA256

```text
447F989BBA1213E54D52CADB768F29EBA62F788341C4AD7A5C6811B41D6C7701  fmg-zh-CN-1.157.0-win-x64.exe
580B56B5C3B43B36332F8A10CC6B552EE99EACD77539C6F0C4C987B7D06B9557  fmg-zh-CN-1.157.0-win-arm64.exe
```

安装包当前没有 Authenticode 代码签名。Windows SmartScreen 可能显示“未知发布者”，请在运行前核对 SHA256。

## 中文版内容

- 简体中文界面、菜单、提示和退出确认。
- 中文、拼音、首字母和别名搜索。
- 中文名称持久化，支持与官方 1.157.0 地图互相打开。
- 国家、省份、城镇、河流、道路、地物、标记、区域、旅程等实体中文名称。
- 深度本地化面板和审校流程。
- 小说地名志导出，支持 Markdown、CSV 和 JSON。
- 四套本地中文字体，不依赖在线字体。
- 长中文标签自动适配，避免截断和重叠。
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

产物输出到 `release/`：

```text
fmg-zh-CN-1.157.0-win-x64.exe
fmg-zh-CN-1.157.0-win-arm64.exe
latest.yml
*.blockmap
```

## 测试

```powershell
npm test -- --run
npm run test:e2e -- --reporter=line
npm run test:electron
npm run test:electron-window
```

Windows 环境下，全量 Vitest 仍有 3 个与上游路径和 Canvas 环境有关的既有失败。Electron 测试、桌面窗口测试和完整 E2E 已通过。

## 项目结构

```text
electron/             Electron 主进程、preload 和更新逻辑
src/                  地图生成器、界面、本地化与渲染代码
scripts/              构建、打包、校验和辅助脚本
tests/                单元测试与 Playwright 测试
docs/                 架构、开发和上游文档
electron-builder.yml  Windows、macOS 和 Linux 打包配置
```

## 上游与许可证

- 上游项目：<https://github.com/Azgaar/Fantasy-Map-Generator>
- 上游版本：`v1.157.0`
- 许可证：MIT

本仓库保留上游版权声明和许可证。提交问题时请同时注明使用版本、操作系统、复现步骤和相关地图文件。
