# T07 四套地图中文字体

日期：2026-11-11

状态：实现和验证完成，停在 T07；未开始 T06，未执行最终安装包打包。

## 1. 字体来源

四个字体包均为 OFL-1.1，已从 npm 包中提取精确 WOFF2 和许可证并提交到仓库。

| 稳定 ID | 界面名称 | 字体 family | npm 包与版本 | WOFF2 SHA-256 |
| --- | --- | --- | --- | --- |
| `song-ke` | 宋刻 | Noto Serif SC | `@fontsource/noto-serif-sc@5.3.1` | `0d5a3fd4981d7cc03ad357775de336b27d41394158d52c7bdda1ab2c68fa1845` |
| `title-song` | 标题宋 | ZCOOL XiaoWei | `@fontsource/zcool-xiaowei@5.3.0` | `f943c7337ff42159a70a21555604b8ae0e40599ecb1455b5c7b219f22642cff2` |
| `wen-kai` | 文楷 | LXGW WenKai | `@fontsource/lxgw-wenkai@5.3.0` | `013fa90e3e7c3b30aeb0a5311ef92d9aee0d3def5817bc27c357198796d34306` |
| `xing-shu` | 行书 | Ma Shan Zheng | `@fontsource/ma-shan-zheng@5.3.1` | `5b31c15b66b61a62ce0ee2d12da1c667ef589272cbfdad1e5bbc930ddf01dabb` |

完整来源清单和上游文件名：

```text
src/assets/fonts/chinese/SOURCES.md
```

许可证随构建发布：

```text
public/fonts/licenses/noto-serif-sc-OFL.txt
public/fonts/licenses/zcool-xiaowei-OFL.txt
public/fonts/licenses/lxgw-wenkai-OFL.txt
public/fonts/licenses/ma-shan-zheng-OFL.txt
```

## 2. 选择与回退

- `options.map.localization.mapFont` 保存稳定 ID，默认 `song-ke`。
- Style 标签中的 Labels 元素新增“中文字图字体”选择，四个选项均为本地字体。
- 中文模式按 `中文字体, 原字体, 中文字体回退, 通用 family` 生成渲染字体栈。
- 原文模式原样返回 `styles` 中的字体 family，不修改 `styles`。
- 中文 `@font-face` 只声明 CJK Unicode 范围；拉丁字母、数字和普通 ASCII 标点继续使用原样式字体。
- 3D 标签先等待字体加载，再测量和绘制 canvas 文字。

## 3. SVG 与 PNG

真实 Chrome 使用当前地图、中文实体名和四套字体分别导出。

| 样式 | SVG 大小 | SVG 内嵌字体 | SVG 中文 | 外部 Google Fonts URL | PNG 大小 | PNG 尺寸 |
| --- | ---: | --- | --- | --- | ---: | --- |
| 宋刻 | 3,096,055 B | 是 | 是 | 无 | 641,647 B | 1280x800 |
| 标题宋 | 4,008,603 B | 是 | 是 | 无 | 637,747 B | 1280x800 |
| 文楷 | 10,725,041 B | 是 | 是 | 无 | 641,524 B | 1280x800 |
| 行书 | 4,694,811 B | 是 | 是 | 无 | 637,643 B | 1280x800 |

四个 SVG 均通过浏览器 XML 解析，并在 Chrome 中作为独立文件打开渲染。四个 PNG 都有 PNG 签名、非空画面和不同 SHA-256。

Inkscape 未安装，因此没有宣称完成 Inkscape 验证。

## 4. 实际渲染

浏览器中四个真实 WOFF2 的 `FontFace` 都加载成功。固定中文样张的四套像素哈希均不同：

```text
song-ke    174e297e
title-song df145b6c
wen-kai    52432934
xing-shu   cb3c368
```

Style 表单中确认存在四项选择。通过表单切换到“标题宋”后，设置保存为 `title-song`，当前标签计算字体为 `"ZCOOL XiaoWei", ...`。

真实地图标签、放大后的地图标签、3D 标签均显示中文字形。3D 关闭/开启标签后 WebGL canvas 数据哈希不同：

```text
before 2c78e8b9
after  e505236d
```

窄视口 480x800：

- 原文模式：`scrollWidth = 480`，计算字体为 `"Almendra SC"`。
- 中文模式：`scrollWidth = 480`，计算字体以 `"LXGW WenKai"` 开头。
- 没有引入横向溢出或字体切换导致的布局回归。

## 5. 自动验证

通过：

- 目标字体/标签/导出单测：98/98。
- `label-groups.dom.test.ts` browser 测试：2/2。
- Electron 单测：9/9。
- `npm run test:scripts`：70/70。
- `npm run build`。
- `npm run electron -- build`。
- `npm run lint-locales`。
- `git diff --check`。
- PWA 预缓存包含四套 WOFF2 和四份许可证。

全量测试：

```text
Test Files: 2 failed | 199 passed
Tests: 3 failed | 2610 passed
```

三个失败仍是已知官方 Windows 基线：`icon-sets` 路径/Canvas 用例 2 个，Assistant 上下文生成器 1 个。

## 6. 接入建议

T06：

- 深度本地化界面可以直接使用 `CHINESE_MAP_FONTS` 和 `options.map.localization.mapFont`。
- 中文/原文切换后需要调用 `drawLabels()`；3D 激活时调用 `View3d.redraw()`。
- 字体预览建议直接使用 `resolveMapFontFamily`，不要复制字体栈。

T10：

- 安装包验收应检查四套 WOFF2 和 `fonts/licenses/` 均存在。
- 应补充 Inkscape 或其他非浏览器 SVG 工具的验收。
- 最终安装器仍需单独授权后打包，不属于 T07。

## 7. 风险

- 文楷单文件约 7.2 MB，嵌入 SVG 后约 10.7 MB；离线能力完整，但大图导出体积明显增加。
- 字体覆盖使用 Google Fonts Chinese Simplified 子集，地图测试名称和固定样张无缺字；未做完整 Unicode 字表逐字审计。
- 现有应用中其他历史装饰字体仍可能引用 Google Fonts；它们不属于 T07 的四套地图字体，也不会替代这四套本地字体。
