// ---------- 古风主题（宣纸 / 水墨色调） ----------

export const theme = {
  /** 地图背景（宣纸米黄） */
  paper: '#f2e8d5',
  /** 面板背景 */
  panel: 'rgba(252, 246, 232, 0.94)',
  /** 面板描边 */
  ink: '#6b5b4e',
  /** 强调（朱砂红，用于都城） */
  cinnabar: '#a03a2e',
  /** 府界线 */
  prefBorder: '#8a7358',
  /** 县点 */
  countyDot: '#6f6154',
  /** 河流 */
  river: '#6f8f83',
  /** 湖泊填充 */
  lakeFill: '#a9c6bb',
  /** 湖泊描边 */
  lakeBorder: '#7d9e92',
  /** 山脉 */
  mountain: '#8d7d68',
  /** 轮廓填充（历代） */
  outlineFill: '#c9b48c',
  /** 轮廓描边 */
  outlineBorder: '#7a6848',
  /** 现代省界（淡参照） */
  modernBorder: '#d9c9a8',
  /** 文字 */
  text: '#4a3f34',
  textLight: '#8a7a66',
  /** 朝代条 */
  activeDynasty: '#a03a2e',
  /** 政权轮廓色板（与 territories.json palette.light 对应） */
  palette: {
    red: '#b0452e',
    amber: '#8f6512',
    green: '#4d7d1e',
    olive: '#6f6d15',
    teal: '#188a70',
    cyan: '#1978a0',
    blue: '#3465c4',
    purple: '#7e4bc0',
    magenta: '#a83fa0',
    rose: '#b23a6b',
    neutral: '#8a7a66',
  } as Record<string, string>,
};

/** 将政权 color 键名（或 #RRGGBB）转为颜色 */
export function regimeColor(color: string): string {
  if (color.startsWith('#')) return color;
  return theme.palette[color] || theme.outlineBorder;
}
