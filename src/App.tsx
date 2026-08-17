import { useEffect, useMemo, useState } from 'react';
import { MapView } from './components/MapView';
import { SearchBox } from './components/SearchBox';
import { DynastyBar } from './components/DynastyBar';
import { DetailPanel } from './components/DetailPanel';
import { LayerPanel } from './components/LayerPanel';
import { loadAll, type AppData } from './data/loader';
import { geojsonToPlaces } from './data/loader';
import type { LayerState, Place } from './types';
import { detailModeOf } from './utils';

const DEFAULT_LAYERS: LayerState = {
  prefectures: true,
  counties: true,
  rivers: true,
  lakes: true,
  mountains: true,
  capitals: true,
  outline: true,
};

/** 构建统一搜索索引：明朝地名 + 湖泊/河流/山脉 + 历代都城 */
function buildSearchIndex(data: AppData): Place[] {
  const list: Place[] = [...data.mingPlaces];
  list.push(...geojsonToPlaces(data.qing.lakes, '湖泊', '清', 'lake'));
  list.push(...geojsonToPlaces(data.qing.rivers, '河流', '清', 'river'));
  list.push(...geojsonToPlaces(data.mountains, '山脉', '—', 'mountain'));

  // 历代都城（按 坐标+名称 去重）
  const seen = new Set<string>();
  for (const s of data.territories.snapshots) {
    for (const r of s.regimes) {
      if (!r.capCoord) continue;
      const key = `${r.capCoord[0]},${r.capCoord[1]}|${r.capital}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        name: `${r.name} · ${r.capital}`,
        type: '都城',
        dynasty: s.era,
        coord: r.capCoord,
        src: 'capital',
        note: r.years,
      });
    }
  }
  return list;
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [progress, setProgress] = useState('准备加载…');
  const [error, setError] = useState('');
  const [currentYear, setCurrentYear] = useState(1420);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<Place | null>(null);

  useEffect(() => {
    loadAll(setProgress)
      .then(setData)
      .catch((e) => setError(String(e?.message || e)));
  }, []);

  const snapshots = useMemo(() => data?.territories.snapshots ?? [], [data]);
  const snapshot = useMemo(
    () => snapshots.find((s) => s.year === currentYear) ?? null,
    [snapshots, currentYear],
  );
  const mode = detailModeOf(currentYear);
  const searchIndex = useMemo(() => (data ? buildSearchIndex(data) : []), [data]);

  const patchLayers = (patch: Partial<LayerState>) => setLayers((l) => ({ ...l, ...patch }));

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-seal">舆</span>
          <div>
            <h1>华夏舆图</h1>
            <p>中国历史地图 · 明朝为重点，历代可览</p>
          </div>
        </div>
        <SearchBox index={searchIndex} onPick={setSelected} />
      </header>

      <DynastyBar snapshots={snapshots} currentYear={currentYear} onPick={setCurrentYear} />

      <main className="map-area">
        {data ? (
          <>
            <MapView
              data={data}
              snapshot={snapshot}
              mode={mode}
              layers={layers}
              selected={selected}
              onSelect={setSelected}
            />
            <LayerPanel layers={layers} mode={mode} onChange={patchLayers} />
            <DetailPanel place={selected} onClose={() => setSelected(null)} />
          </>
        ) : (
          <div className="loading">
            {error ? <div className="loading-error">加载失败：{error}</div> : <div>{progress}…</div>}
          </div>
        )}
      </main>
    </div>
  );
}
