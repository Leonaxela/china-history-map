import type { Place } from '../types';

interface Props {
  place: Place | null;
  onClose: () => void;
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="detail-row">
      <span className="detail-k">{k}</span>
      <span className="detail-v">{v}</span>
    </div>
  );
}

export function DetailPanel({ place, onClose }: Props) {
  if (!place) return null;
  return (
    <div className="detail-panel">
      <button className="detail-close" onClick={onClose}>
        ×
      </button>
      <div className="detail-title">{place.name}</div>
      <div className="detail-body">
        <Row k="类型" v={place.type} />
        <Row k="朝代" v={place.dynasty} />
        <Row k="今地" v={place.present} />
        <Row k="年代" v={place.note} />
        <Row k="说明" v={place.extra} />
        <Row k="坐标" v={place.coord ? `${place.coord[1].toFixed(3)}°N, ${place.coord[0].toFixed(3)}°E` : ''} />
      </div>
      <div className="detail-source">数据来源：CHGIS v6 / 示意数据，仅供参考</div>
    </div>
  );
}
