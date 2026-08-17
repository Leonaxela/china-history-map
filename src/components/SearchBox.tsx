import { useEffect, useRef, useState } from 'react';
import type { Place } from '../types';

interface Props {
  index: Place[];
  onPick: (p: Place) => void;
}

const MAX = 40;

export function SearchBox({ index, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const results: Place[] = q
    ? index.filter((p) => p.name.includes(q)).slice(0, MAX)
    : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (p: Place) => {
    onPick(p);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="search-box" ref={boxRef}>
      <div className="search-input-wrap">
        <span className="search-icon">搜</span>
        <input
          value={query}
          placeholder="搜索城市、县、湖、山、都城…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {q && (
          <button className="search-clear" onClick={() => setQuery('')}>
            ×
          </button>
        )}
      </div>
      {open && q && (
        <div className="search-results">
          {results.length === 0 && <div className="search-empty">未找到「{q}」</div>}
          {results.map((p, i) => (
            <div
              key={p.src + p.name + i}
              className="search-item"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
            >
              <span className="search-item-name">{p.name}</span>
              <span className="search-item-type">{p.type}</span>
              {p.dynasty && <span className="search-item-dyn">{p.dynasty}</span>}
            </div>
          ))}
          {results.length >= MAX && <div className="search-more">结果过多，仅显示前 {MAX} 条，请输入更精确的关键词</div>}
        </div>
      )}
    </div>
  );
}
