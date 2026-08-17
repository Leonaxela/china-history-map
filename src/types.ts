// ---------- 数据模型 ----------

/** 搜索/详情用的地点条目 */
export interface Place {
  name: string;
  /** 类型：府 / 州 / 县 / 都城 / 湖泊 / 河流 / 山脉 / 政权 */
  type: string;
  /** 所属朝代（明 / 清 / 各代） */
  dynasty?: string;
  coord: [number, number];
  present?: string;
  note?: string;
  /** 来源图层：ming / lake / river / mountain / capital / regime / outline */
  src?: string;
  /** 额外信息（政权的年代、简介等） */
  extra?: string;
}

/** 历代断面中的政权 */
export interface Regime {
  name: string;
  color: string;
  capital: string;
  capCoord: [number, number];
  years: string;
  desc: string;
  label?: [number, number];
  provinces: string[];
}

/** 历史断面（territories.json snapshot） */
export interface DynastySnapshot {
  year: number;
  era: string;
  label: string;
  regimes: Regime[];
}

/** 断面渲染模式 */
export type DetailMode = 'ming' | 'qing' | 'outline';

/** 图层开关 */
export interface LayerState {
  prefectures: boolean; // 府界（明）或省界（清）
  counties: boolean; // 县点（明）
  rivers: boolean;
  lakes: boolean;
  mountains: boolean;
  capitals: boolean; // 都城 / 政权标注
  outline: boolean; // 历代疆域轮廓
}

/** GeoJSON 简型 */
export interface GeoJson {
  type: string;
  features: Array<{
    type: string;
    properties: Record<string, unknown>;
    geometry: Record<string, unknown> | null;
  }>;
}
