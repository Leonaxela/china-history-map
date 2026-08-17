import type { DetailMode } from './types';

/** 断面年份 → 渲染模式：明朝 / 清朝（详细数据）或历代轮廓 */
export function detailModeOf(year: number): DetailMode {
  if (year === 1420 || year === 1644) return 'ming';
  if (year >= 1760 && year <= 1895) return 'qing';
  return 'outline';
}

/** 断面年份 → 模式说明（用于 UI 徽标） */
export function modeBadge(mode: DetailMode): string {
  if (mode === 'ming') return '详细';
  if (mode === 'qing') return '详细';
  return '示意';
}
