import { useEffect, useRef } from 'react';
import type { DynastySnapshot } from '../types';
import { detailModeOf, modeBadge } from '../utils';

interface Props {
  snapshots: DynastySnapshot[];
  currentYear: number;
  onPick: (year: number) => void;
}

export function DynastyBar({ snapshots, currentYear, onPick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 使当前断面（默认 1420 明）始终滚动到可见区域中央
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const btn = container.querySelector<HTMLButtonElement>(`[data-year="${currentYear}"]`);
    if (!btn) return;
    container.scrollLeft = btn.offsetLeft - (container.clientWidth - btn.clientWidth) / 2;
  }, [currentYear, snapshots]);

  return (
    <div className="dynasty-bar">
      <div className="dynasty-scroll" ref={scrollRef}>
        {snapshots.map((s) => {
          const mode = detailModeOf(s.year);
          const active = s.year === currentYear;
          return (
            <button
              key={s.year}
              data-year={s.year}
              className={'dynasty-item' + (active ? ' active' : '')}
              onClick={() => onPick(s.year)}
              title={s.label}
            >
              <span className="dynasty-era">{s.era}</span>
              <span className="dynasty-year">{s.year}</span>
              <span className={'dynasty-badge m' + mode}>{modeBadge(mode)}</span>
            </button>
          );
        })}
      </div>
      <div className="dynasty-hint">
        当前断面：{currentYear} 年 · 点击上方朝代切换（明、清为详细数据，其余为示意轮廓）
      </div>
    </div>
  );
}
