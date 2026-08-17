import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AppData } from '../data/loader';
import type { DetailMode, DynastySnapshot, LayerState, Place } from '../types';
import { regimeColor, theme } from '../theme';

interface Props {
  data: AppData;
  snapshot: DynastySnapshot | null;
  mode: DetailMode;
  layers: LayerState;
  selected: Place | null;
  onSelect: (p: Place) => void;
}

const GEO = (gj: AppData['mingPrefectures']) => gj as unknown as GeoJSON.GeoJsonObject;

/** GeoJSON 选项：@types/leaflet 的 GeoJSONOptions 漏掉了 renderer 字段（Leaflet 运行时支持），此处补齐 */
type GeoOpts = L.GeoJSONOptions & { renderer?: L.Renderer };

/** 都城 / 政权标注图标 */
function capitalIcon(name: string, big = false): L.DivIcon {
  return L.divIcon({
    className: 'antique-capital',
    html: `<span class="capital-dot${big ? ' big' : ''}"></span><span class="capital-name">${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function MapView({ data, snapshot, mode, layers, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rootRef = useRef<L.LayerGroup | null>(null);
  const countiesRef = useRef<L.Layer | null>(null);
  const canvasRef = useRef<{ low: L.Canvas; high: L.Canvas } | null>(null);
  const prefsRef = useRef<L.GeoJSON | null>(null);
  const cbRef = useRef({ onSelect });
  cbRef.current = { onSelect };
  const selRef = useRef(selected);
  selRef.current = selected;

  /** 高亮选中的府名标签（绿色），便于第一时间定位 */
  const applyHighlight = () => {
    const prefs = prefsRef.current;
    if (!prefs) return;
    const selName = selRef.current?.name ?? null;
    prefs.eachLayer((l) => {
      const layer = l as L.Path;
      const t = layer.getTooltip();
      if (!t) return;
      const el = t.getElement();
      if (!el) return;
      const f = (layer as unknown as { feature?: { properties?: Record<string, unknown> } }).feature;
      const n = String(f?.properties?.NAME_CH ?? '');
      if (selName && n === selName) el.classList.add('antique-label-highlight');
      else el.classList.remove('antique-label-highlight');
    });
  };

  // ---- 初始化地图（仅一次） ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [35.5, 107.5],
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: true,
    });
    mapRef.current = map;
    rootRef.current = L.layerGroup().addTo(map);

    // Canvas 渲染器：低层（河流/湖泊）+ 高层（县点）。
    // 相比 SVG（每个要素一个 DOM 节点），Canvas 整体绘制，拖动/缩放开销极小。
    map.createPane('canvas-low');
    map.getPane('canvas-low')!.style.zIndex = '300'; // tile(200) 之上、SVG overlay(400) 之下
    const cvLow = L.canvas({ pane: 'canvas-low', padding: 0.5 });
    map.createPane('canvas-high');
    map.getPane('canvas-high')!.style.zIndex = '550'; // overlay(400) 之上、marker(600) 之下
    const cvHigh = L.canvas({ pane: 'canvas-high', padding: 0.5 });
    canvasRef.current = { low: cvLow, high: cvHigh };

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control
      .attribution({ prefix: false, position: 'bottomleft' })
      .addAttribution('数据来源：CHGIS v6（哈佛费正清研究中心 · 复旦中国历史地理研究所）')
      .addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      rootRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  // ---- 重建图层 ----
  useEffect(() => {
    const map = mapRef.current;
    const root = rootRef.current;
    if (!map || !root) return;
    const cb = cbRef.current;
    let prefsLayer: L.GeoJSON | null = null;

    // 清理旧的县点图层及监听
    if (countiesRef.current) {
      map.removeLayer(countiesRef.current);
      countiesRef.current = null;
    }

    root.clearLayers();

    // ---- 公共图层：山脉 / 湖泊 / 河流 ----
    if (layers.mountains) {
      const l = L.geoJSON(GEO(data.mountains), {
        style: { color: theme.mountain, weight: 1.6, dashArray: '7 5', opacity: 0.9 },
        onEachFeature: (f, layer) => {
          const n = String(f.properties?.name || '');
          if (n) layer.bindTooltip(n, { className: 'antique-tooltip' });
          layer.on('click', () => {
            const c = (layer as L.Polyline).getBounds().getCenter();
            cb.onSelect({ name: n, type: '山脉', dynasty: '—', coord: [c.lng, c.lat], src: 'mountain' });
          });
        },
      });
      l.addTo(root);
    }

    if (layers.lakes) {
      const lakes = data.qing.lakes;
      const l = L.geoJSON(GEO(lakes), {
        renderer: canvasRef.current?.low,
        style: { color: theme.lakeBorder, weight: 0.8, fillColor: theme.lakeFill, fillOpacity: 0.55 },        onEachFeature: (f, layer) => {
          const n = String(f.properties?.NAME_CH || '').trim();
          if (n) layer.bindTooltip(n, { className: 'antique-tooltip' });
          layer.on('click', () => {
            const c = (layer as L.Polygon).getBounds().getCenter();
            cb.onSelect({ name: n || '（未名湖）', type: '湖泊', dynasty: '清', coord: [c.lng, c.lat], src: 'lake' });
          });
        },
      } as GeoOpts);
      l.addTo(root);
    }

    if (layers.rivers) {
      const rivers = data.qing.rivers;
      const l = L.geoJSON(GEO(rivers), {
        renderer: canvasRef.current?.low,
        style: { color: theme.river, weight: 0.5, opacity: 0.7 },
        onEachFeature: (f, layer) => {
          const n = String(f.properties?.NAME_CH || '').trim();
          if (n) layer.bindTooltip(n, { className: 'antique-tooltip' });
          layer.on('click', () => {
            const c = (layer as L.Polyline).getBounds().getCenter();
            cb.onSelect({ name: n || '（未名河段）', type: '河流', dynasty: '清', coord: [c.lng, c.lat], src: 'river' });
          });
        },
      } as GeoOpts);
      l.addTo(root);
    }

    // ---- 明朝模式 ----
    if (mode === 'ming') {
      if (layers.prefectures) {
        const l = L.geoJSON(GEO(data.mingPrefectures), {
          style: { color: theme.prefBorder, weight: 1, fillColor: '#e9ddc4', fillOpacity: 0.3 },
          onEachFeature: (f, layer) => {
            const p = f.properties as Record<string, string | number>;
            const n = String(p.NAME_CH || '');
            // 府名常驻显示（按缩放级别显隐，见 updateLabels）
            if (n) layer.bindTooltip(n, { permanent: true, direction: 'center', className: 'antique-label' });
            layer.on('click', () => {
              const c = (layer as L.Polygon).getBounds().getCenter();
              cb.onSelect({
                name: n,
                type: String(p.TYPE_CH || '府'),
                dynasty: '明',
                coord: [c.lng, c.lat],
                src: 'ming',
                present: String(p.PRES_LOC || ''),
                note: p.BEG_YR && p.END_YR ? `建置 ${p.BEG_YR} – ${p.END_YR}` : '',
              });
            });
          },
        });
        l.addTo(root);
        prefsLayer = l;
        prefsRef.current = l;
      }

      // 县点：CircleMarker + 高层 Canvas，随缩放显隐（zoom >= 6）
      if (layers.counties) {
        const counties = L.geoJSON(GEO(data.mingCounties), {
          renderer: canvasRef.current?.high,
          pointToLayer: (_f, latlng) =>
            L.circleMarker(latlng, {
              radius: 2.5,
              color: theme.countyDot,
              weight: 1,
              fillColor: theme.countyDot,
              fillOpacity: 0.85,
            }),
          onEachFeature: (f, layer) => {
            const p = f.properties as Record<string, string | number>;
            const n = String(p.NAME_CH || '');
            const m = layer as L.CircleMarker;
            const latlng = m.getLatLng();
            m.bindTooltip(n, { className: 'antique-tooltip' });
            m.on('click', () =>
              cb.onSelect({
                name: n,
                type: String(p.TYPE_CH || '县'),
                dynasty: '明',
                coord: [latlng.lng, latlng.lat],
                src: 'county',
                present: String(p.PRES_LOC || ''),
              }),
            );
          },
        } as GeoOpts);
        countiesRef.current = counties;
      }

      // 明朝两京
      if (layers.capitals) {
        const capitals = data.mingPlaces.filter((p) => p.type === '都城');
        for (const c of capitals) {
          L.marker([c.coord[1], c.coord[0]], { icon: capitalIcon(c.name, true) })
            .addTo(root)
            .on('click', () => cb.onSelect({ ...c, src: 'capital' }));
        }
      }
    }

    // ---- 清朝模式 ----
    if (mode === 'qing') {
      L.geoJSON(GEO(data.qing.province), {
        style: { color: theme.prefBorder, weight: 1.4, fillColor: '#e9ddc4', fillOpacity: 0.3 },
        onEachFeature: (f, layer) => {
          const n = String(f.properties?.NAME_CH || '');
          layer.on('click', () => {
            const c = (layer as L.Polygon).getBounds().getCenter();
            cb.onSelect({ name: n, type: '省', dynasty: '清', coord: [c.lng, c.lat], src: 'qing' });
          });
        },
      }).addTo(root);

      if (layers.prefectures) {
        L.geoJSON(GEO(data.qing.prefecture), {
          style: { color: theme.prefBorder, weight: 0.7, fillColor: 'transparent', opacity: 0.7 },
          onEachFeature: (f, layer) => {
            const n = String(f.properties?.NAME_CH || '');
            if (n) layer.bindTooltip(n, { className: 'antique-tooltip' });
          },
        }).addTo(root);
      }

      if (layers.capitals) {
        L.marker([39.9, 116.4], { icon: capitalIcon('京师（北京）', true) })
          .addTo(root)
          .on('click', () =>
            cb.onSelect({
              name: '京师（北京）',
              type: '都城',
              dynasty: '清',
              coord: [116.4, 39.9],
              present: '北京市',
              src: 'capital',
            }),
          );
      }
    }

    // ---- 历代轮廓模式（含各政权标注） ----
    if (mode === 'outline' && snapshot && layers.outline) {
      for (const regime of snapshot.regimes) {
        const color = regimeColor(regime.color);
        const feats = data.modernChina.features.filter((f) =>
          regime.provinces.includes(String(f.properties?.name || '')),
        );
        if (!feats.length) continue;
        L.geoJSON(GEO({ type: 'FeatureCollection', features: feats }), {
          style: { color, weight: 1.2, fillColor: color, fillOpacity: 0.18, dashArray: '4 4' },
          onEachFeature: (_f, layer) => {
            layer.on('click', () =>
              cb.onSelect({
                name: regime.name,
                type: '政权',
                dynasty: snapshot.era,
                coord: regime.capCoord,
                src: 'regime',
                note: regime.years,
                extra: regime.desc,
              }),
            );
          },
        }).addTo(root);
      }

      if (layers.capitals) {
        for (const regime of snapshot.regimes) {
          const pos = regime.label || regime.capCoord;
          L.marker([pos[1], pos[0]], { icon: capitalIcon(regime.name), interactive: false }).addTo(root);
          if (regime.capCoord) {
            L.marker([regime.capCoord[1], regime.capCoord[0]], { icon: capitalIcon(regime.capital) })
              .addTo(root)
              .on('click', () =>
                cb.onSelect({
                  name: `${regime.name} · ${regime.capital}`,
                  type: '都城',
                  dynasty: snapshot.era,
                  coord: regime.capCoord,
                  src: 'capital',
                  note: regime.years,
                  extra: regime.desc,
                }),
              );
          }
        }
      }
    }

    // ---- 县点缩放联动 ----
    const updateCounties = () => {
      const counties = countiesRef.current;
      if (!counties) return;
      if (map.getZoom() >= 6) {
        if (!map.hasLayer(counties)) counties.addTo(map);
      } else if (map.hasLayer(counties)) {
        map.removeLayer(counties);
      }
    };
    updateCounties();
    map.on('zoomend', updateCounties);

    // ---- 府名标签缩放联动（zoom >= 6 常驻显示，小比例尺隐藏避免重叠） ----
    const updateLabels = () => {
      if (!prefsLayer) return;
      prefsLayer.eachLayer((l) => {
        const layer = l as L.Path;
        if (!layer.getTooltip()) return;
        if (map.getZoom() >= 6) layer.openTooltip();
        else layer.closeTooltip();
      });
      applyHighlight();
    };
    updateLabels();
    map.on('zoomend', updateLabels);
    return () => {
      map.off('zoomend', updateCounties);
      map.off('zoomend', updateLabels);
    };
  }, [data, snapshot, mode, layers]);

  // ---- 选中地点飞行定位 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.flyTo([selected.coord[1], selected.coord[0]], Math.max(map.getZoom(), 7), { duration: 0.6 });
  }, [selected]);

  // ---- 选中府名标签高亮（绿色） ----
  useEffect(() => {
    applyHighlight();
  }, [selected, mode, layers]);

  return <div ref={containerRef} className="map-container" />;
}
