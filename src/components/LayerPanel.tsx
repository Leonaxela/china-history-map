import type { DetailMode, LayerState } from '../types';

interface Props {
  layers: LayerState;
  mode: DetailMode;
  onChange: (patch: Partial<LayerState>) => void;
}

interface Item {
  key: keyof LayerState;
  label: string;
  /** 该图层生效的模式（undefined = 始终） */
  modes?: DetailMode[];
}

const ITEMS: Item[] = [
  { key: 'outline', label: '历代疆域轮廓', modes: ['outline'] },
  { key: 'prefectures', label: '府界 / 省界', modes: ['ming', 'qing'] },
  { key: 'counties', label: '县点（放大显示）', modes: ['ming'] },
  { key: 'rivers', label: '河流', modes: ['ming', 'qing'] },
  { key: 'lakes', label: '湖泊', modes: ['ming', 'qing'] },
  { key: 'mountains', label: '山脉', modes: ['ming', 'qing', 'outline'] },
  { key: 'capitals', label: '都城 / 政权', modes: ['ming', 'qing', 'outline'] },
];

export function LayerPanel({ layers, mode, onChange }: Props) {
  return (
    <div className="layer-panel">
      <div className="layer-title">图层</div>
      {ITEMS.map((it) => {
        const enabled = !it.modes || it.modes.includes(mode);
        if (!enabled) return null;
        return (
          <label key={it.key} className="layer-item">
            <input
              type="checkbox"
              checked={layers[it.key]}
              onChange={(e) => onChange({ [it.key]: e.target.checked })}
            />
            <span>{it.label}</span>
          </label>
        );
      })}
    </div>
  );
}
