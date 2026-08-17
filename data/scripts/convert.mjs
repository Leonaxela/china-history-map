// 数据转换脚本：从 data/raw 产出 data/processed（前端使用的精简数据）
// 运行：node data/scripts/convert.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, '..', 'raw');
// 输出到 public/data/，由 Vite 直接静态服务，前端 fetch 加载
const OUT = path.join(__dirname, '..', '..', 'public', 'data');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(RAW, name), 'utf8'));
}
function save(name, obj) {
  const p = path.join(OUT, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
  console.log('写出', name, (fs.statSync(p).size / 1024).toFixed(1) + 'KB');
}

// ---------- 1. 明朝（1368–1644）：时间序列过滤 ----------
const MING_START = 1368, MING_END = 1644;
const overlap = (p) => {
  const b = p.BEG_YR, e = p.END_YR;
  if (b == null || e == null) return false;
  return b <= MING_END && (e === 0 || e >= MING_START);
};

// 要素的代表坐标（府界用治所 X/Y，县点用 Point 坐标）
const coordOf = (f) => {
  const p = f.properties;
  if (p.X_COORD != null && p.Y_COORD != null) return [p.X_COORD, p.Y_COORD];
  if (f.geometry && f.geometry.type === 'Point') return f.geometry.coordinates;
  return null;
};

// 该建置与明朝时段的重叠年数（用于去重时保留最完整的一条）
const overlapLen = (f) => {
  const p = f.properties;
  const b = p.BEG_YR ?? 0, e = p.END_YR ?? 0;
  return Math.max(0, Math.min(e || MING_END, MING_END) - Math.max(b, MING_START));
};

// 去重：同名同类型且治所坐标相近（< 2°≈220km，视为同一地方）的记录，
// 只保留与明朝交叠最长的一条。覆盖同一政区的分段建置及治所坐标漂移
// （如岳州府坐标 1.4° 差异）；同名异地（如安徽太平府 / 广西太平府，
// 相距上千公里）不受影响。
const dedupe = (features) => {
  const groups = new Map();
  for (const f of features) {
    const p = f.properties;
    const key = `${p.NAME_CH}|${p.TYPE_CH || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const out = [];
  for (const list of groups.values()) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    // 按坐标聚类
    const clusters = [];
    for (const f of list) {
      const c = coordOf(f);
      const hit = clusters.find((cl) =>
        cl.some((x) => {
          const d = coordOf(x);
          return c && d && Math.hypot(c[0] - d[0], c[1] - d[1]) < 2;
        }),
      );
      if (hit) hit.push(f);
      else clusters.push([f]);
    }
    for (const cl of clusters) out.push(cl.reduce((a, b) => (overlapLen(b) > overlapLen(a) ? b : a)));
  }
  return out;
};

const prefs = load('chgis-timeseries-prefecture.geojson');
const rawPrefs = prefs.features.filter((f) => overlap(f.properties));
const mingPrefs = {
  type: 'FeatureCollection',
  features: dedupe(rawPrefs),
};
save('ming-prefectures.geojson', mingPrefs);

const counties = load('chgis-timeseries-county-points.geojson');
const rawCounties = counties.features.filter((f) => overlap(f.properties));
const mingCounties = {
  type: 'FeatureCollection',
  features: dedupe(rawCounties),
};
save('ming-county-points.geojson', mingCounties);

// ---------- 2. 明朝搜索索引（府/州 + 县点 + 两京） ----------
const places = [];
for (const f of mingPrefs.features) {
  const p = f.properties;
  const coord = [p.X_COORD, p.Y_COORD];
  if (!coord[0] || !coord[1]) continue;
  places.push({
    name: p.NAME_CH,
    type: p.TYPE_CH === '府' ? '府' : '州', // 直隶州/州/路 等都算州级
    dynasty: '明',
    coord,
    present: p.PRES_LOC || '',
  });
}
for (const f of mingCounties.features) {
  const p = f.properties;
  const g = f.geometry;
  if (!g || g.type !== 'Point') continue;
  places.push({
    name: p.NAME_CH,
    type: '县',
    dynasty: '明',
    coord: g.coordinates,
    present: p.PRES_LOC || '',
  });
}

// 索引级去重：同一名称且治所坐标相近（同一地方）的条目只保留一条。
// 解决「滁州 / 福宁州」等在府级与县级数据中各收录一次的问题；
// 真正同名异地（太平府 安徽/广西、新城县×5 等）坐标相距远，不受影响。
const typeRank = { 府: 4, 州: 3, 都城: 2, 县: 1 };
const dedupePlaces = (list) => {
  const out = [];
  for (const p of list) {
    const hit = out.find(
      (x) => x.name === p.name && Math.hypot(x.coord[0] - p.coord[0], x.coord[1] - p.coord[1]) < 2,
    );
    if (!hit) {
      out.push({ ...p });
      continue;
    }
    if ((typeRank[p.type] || 0) > (typeRank[hit.type] || 0)) Object.assign(hit, p);
  }
  return out;
};
// 明朝两京（手动补充，territories 里北京 1421 年迁都）
places.push({ name: '顺天府（北京）', type: '都城', dynasty: '明', coord: [116.4, 39.9], present: '北京市', note: '明成祖迁都后京师，即顺天府' });
places.push({ name: '应天府（南京）', type: '都城', dynasty: '明', coord: [118.8, 32.06], present: '江苏省南京市', note: '明初京师，迁都后为留都' });
// 两京加入后再做索引级去重（若两京与数据中同名条目同地，保留都城）
const finalPlaces = dedupePlaces(places);
save('ming-places.json', finalPlaces);

// ---------- 3. 历代断面（轮廓+首都）直接拷贝 ----------
const territories = load('territories.json');
save('territories.json', territories);

// ---------- 4. 清代 1820 快照（省/府/湖泊/河流） ----------
const qingDir = path.join(OUT, 'qing1820');
fs.mkdirSync(qingDir, { recursive: true });
for (const f of ['chgis-1820-province.geojson', 'chgis-1820-prefecture.geojson', 'chgis-1820-lakes.geojson', 'chgis-1820-rivers.geojson']) {
  fs.copyFileSync(path.join(RAW, f), path.join(qingDir, f));
  console.log('拷贝', 'qing1820/' + f);
}

// ---------- 5. 现代省界底图 ----------
fs.copyFileSync(path.join(RAW, 'modern-china.geojson'), path.join(OUT, 'modern-china.geojson'));
console.log('拷贝', 'modern-china.geojson');

// ---------- 统计 ----------
console.log('---');
console.log('府级：明朝时段过滤', rawPrefs.length, '→ 去重后', mingPrefs.features.length, '（合并', rawPrefs.length - mingPrefs.features.length, '条分段建置）');
console.log('县级：明朝时段过滤', rawCounties.length, '→ 去重后', mingCounties.features.length, '（合并', rawCounties.length - mingCounties.features.length, '条分段建置）');
console.log('明朝搜索索引条目:', finalPlaces.length);
const typeCount = {};
for (const p of finalPlaces) typeCount[p.type] = (typeCount[p.type] || 0) + 1;
console.log('索引类型分布:', JSON.stringify(typeCount));
