// ---------- 数据加载（public/data 静态资源） ----------
import type { DynastySnapshot, GeoJson, Place } from '../types';

const DATA = 'data/';

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`加载失败: ${url} (${r.status})`);
  return r.json() as Promise<T>;
}

/** 应用内全部数据，加载一次后缓存 */
export interface AppData {
  mingPrefectures: GeoJson;
  mingCounties: GeoJson;
  mingPlaces: Place[];
  territories: { snapshots: DynastySnapshot[] };
  mountains: GeoJson;
  modernChina: GeoJson;
  qing: {
    province: GeoJson;
    prefecture: GeoJson;
    lakes: GeoJson;
    rivers: GeoJson;
  };
}

let cache: AppData | null = null;

export async function loadAll(onProgress?: (label: string) => void): Promise<AppData> {
  if (cache) return cache;
  const t = (label: string) => onProgress?.(label);
  const [mingPrefs, mingCounties, mingPlaces, territories, mountains, modernChina, qProvince, qPref, qLakes, qRivers] =
    await Promise.all([
      fetchJson<GeoJson>(DATA + 'ming-prefectures.geojson').then((d) => (t('明朝府界'), d)),
      fetchJson<GeoJson>(DATA + 'ming-county-points.geojson').then((d) => (t('明朝县点'), d)),
      fetchJson<Place[]>(DATA + 'ming-places.json').then((d) => (t('明朝地名索引'), d)),
      fetchJson<{ snapshots: DynastySnapshot[] }>(DATA + 'territories.json').then((d) => (t('历代断面'), d)),
      fetchJson<GeoJson>(DATA + 'mountains.geojson').then((d) => (t('山脉'), d)),
      fetchJson<GeoJson>(DATA + 'modern-china.geojson').then((d) => (t('现代省界'), d)),
      fetchJson<GeoJson>(DATA + 'qing1820/chgis-1820-province.geojson'),
      fetchJson<GeoJson>(DATA + 'qing1820/chgis-1820-prefecture.geojson'),
      fetchJson<GeoJson>(DATA + 'qing1820/chgis-1820-lakes.geojson'),
      fetchJson<GeoJson>(DATA + 'qing1820/chgis-1820-rivers.geojson'),
    ]);
  cache = {
    mingPrefectures: mingPrefs,
    mingCounties: mingCounties,
    mingPlaces: mingPlaces,
    territories,
    mountains,
    modernChina,
    qing: { province: qProvince, prefecture: qPref, lakes: qLakes, rivers: qRivers },
  };
  return cache;
}

/** 由 GeoJSON 提取带坐标的要素（点/线/面取代表点），用于搜索与详情 */
export function geojsonToPlaces(gj: GeoJson, type: string, dynasty: string, src: string): Place[] {
  const out: Place[] = [];
  for (const f of gj.features) {
    const name = String(f.properties?.NAME_CH || f.properties?.name || '').trim();
    if (!name || !f.geometry) continue;
    const coord = centerOf(f.geometry);
    if (!coord) continue;
    out.push({ name, type, dynasty, coord, src, extra: String(f.properties?.PRES_LOC || '') });
  }
  return out;
}

function centerOf(geom: Record<string, unknown>): [number, number] | null {
  try {
    const g = geom as { type: string; coordinates: unknown };
    if (g.type === 'Point') {
      const c = g.coordinates as number[];
      return [c[0], c[1]];
    }
    // 取第一个环的第一个点作为代表坐标（足够用于搜索/详情）
    if (g.type === 'LineString' || g.type === 'MultiPoint') {
      const c = g.coordinates as number[][];
      const mid = c[Math.floor(c.length / 2)];
      return mid ? [mid[0], mid[1]] : null;
    }
    if (g.type === 'Polygon') {
      const ring = (g.coordinates as number[][][])[0];
      return ring ? [ring[0][0], ring[0][1]] : null;
    }
    if (g.type === 'MultiLineString') {
      const lines = g.coordinates as number[][][];
      const line = lines[0];
      if (!line) return null;
      const mid = line[Math.floor(line.length / 2)];
      return mid ? [mid[0], mid[1]] : null;
    }
    if (g.type === 'MultiPolygon') {
      const polys = g.coordinates as number[][][][];
      const ring = polys[0]?.[0];
      return ring ? [ring[0][0], ring[0][1]] : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}
