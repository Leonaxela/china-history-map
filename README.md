# 华夏舆图 · 中国历史地图

一个类似高德/百度地图交互的**古代中国地图**网页应用：支持搜索、查看城市 / 县 / 湖泊 / 山脉 / 都城，可切换朝代。

- **明朝**为数据重点：府级边界、县级点位、两京（顺天府 / 应天府）可搜索、可点击查看详情
- **清朝**：1820 年省级 / 府级边界、湖泊、河流
- **其他朝代**：示意轮廓（按现代省份组合近似）+ 都城搜索，数据后续逐步补充

## 运行

```bash
npm install        # 安装依赖
npm run dev        # 开发模式（浏览器打开 http://localhost:5173）
npm run build      # 生产构建（输出 dist/）
npm run preview    # 预览构建产物
npm run data       # 重新执行数据转换脚本（data/raw -> public/data）
```

> 注意：页面全部数据均为本地静态文件（`public/data/`），完全离线可用，无任何外部瓦片请求。

## 技术栈

- Vite 6 + React 19 + TypeScript（严格模式）
- Leaflet 1.9（矢量渲染 GeoJSON，无在线底图）
- 全自绘「宣纸 / 水墨」古风主题（CSS），无需图片资源

## 目录结构

```
public/data/                  # 前端加载的数据（由 data/scripts 生成）
  ming-prefectures.geojson    # 明朝府级边界（时间序列过滤 1368–1644）
  ming-county-points.geojson  # 明朝县级点位
  ming-places.json            # 明朝搜索索引（府/州/县/两京）
  territories.json            # 历代 30 个断面：疆域轮廓 + 都城 + 简介
  mountains.geojson           # 山脉示例数据（约 25 条主要山脉）
  qing1820/                   # 清 1820 年快照：省/府/湖泊/河流
  modern-china.geojson        # 现代省界（用于历代轮廓拼合）
data/
  raw/                        # 原始下载数据（不入 git）
  scripts/
    convert.mjs               # 转换脚本：过滤明朝、生成搜索索引、拷贝快照
    make-mountains.mjs        # 生成山脉示例数据
src/
  components/                 # MapView / SearchBox / DynastyBar / DetailPanel / LayerPanel
  data/loader.ts              # 数据加载与 GeoJSON -> Place 工具
  theme.ts                    # 古风配色
  types.ts / utils.ts         # 类型与工具
```

## 数据来源与许可

| 数据 | 来源 | 许可 |
|---|---|---|
| 明朝府界 / 县点（时间序列） | CHGIS Version 6（哈佛费正清研究中心 · 复旦中国历史地理研究所） | 学术/教育非商业用途免费；允许使用部分数据；**禁止整体再分发与商业用途**（详见 CHGIS EULA） |
| 清 1820 省/府/湖泊/河流 | 同上（1820 CE dataset） | 同上 |
| 历代疆域断面 + 都城 | 开源示意数据（按现代省份组合近似，非严格史实边界） | 源未声明 license，仅供教学展示 |
| 山脉 | 本项目手工示例（简化走向） | 示例数据 |

CHGIS 引用规范：

> "CHGIS Version 6." (c) Fairbank Center for Chinese Studies and the Institute for Chinese Historical Geography at Fudan University, Dec 2016.

## 数据格式与补充指南

### 明朝（重点，后续补数据）

1. **补府界**：向 `public/data/ming-prefectures.geojson` 的 `features` 添加 Polygon，属性字段：
   - `NAME_CH` 名称（如「顺天府」）
   - `TYPE_CH` 类型（府 / 直隶州 / 州）
   - `BEG_YR` / `END_YR` 建置与废置年份（0 表示未知）
   - `X_COORD` / `Y_COORD` 治所经纬度（可选）
   - `PRES_LOC` 今地（可选）
2. **补县点**：向 `ming-county-points.geojson` 添加 Point 要素，属性同上（`TYPE_CH=县`）。
3. 修改后运行 `npm run data` 重新生成 `ming-places.json` 搜索索引。

### 山脉

编辑 `data/scripts/make-mountains.mjs` 中 `ranges` 数组（名称 + 折线坐标数组），或直接修改 `public/data/mountains.geojson`，然后运行 `npm run data`。当前为示例数据，坐标为简化示意走向。

### 历代轮廓 / 都城

编辑 `public/data/territories.json`：每个断面（snapshot）含 `year`、`era`、`label`、`regimes[]`，每个政权含 `name`（国名）、`capital` + `capCoord`（都城及坐标）、`provinces`（现代省份简称列表，用于拼合疆域）、`color`、`years`、`desc`。

### 新增朝代详细数据

在 `src/utils.ts` 的 `detailModeOf()` 中把断面年份映射到 `'ming' | 'qing' | 'outline'`，并在 `src/components/MapView.tsx` 添加对应模式的数据渲染分支即可。

## 已知限制

- CHGIS 时间序列收录的是「有建置/废置记录的政区」，并非某年代完整政区图，因此明朝显示府数少于实际（明朝时段 362 个），后续可用完整断代数据替换
- 河流 / 湖泊当前为清 1820 快照（明朝模式下作为参照展示）
- 山脉为示例数据，坐标经简化
- 历代疆域为示意轮廓（现代省份组合近似），非严格史实边界
