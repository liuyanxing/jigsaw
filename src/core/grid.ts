// 网格几何。世界坐标 = 原图像素空间:单元 (r,c) 的世界矩形 == 该位置在原图中的裁剪框。
// 块 id == 它的 home 单元序号(r*cols+c),其图像内容即 home 单元的世界矩形。

export interface Grid {
  rows: number
  cols: number
  imgW: number
  imgH: number
  cellW: number
  cellH: number
}

export function makeGrid(imgW: number, imgH: number, rows: number, cols: number): Grid {
  return { rows, cols, imgW, imgH, cellW: imgW / cols, cellH: imgH / rows }
}

/** 单元 (r,c) 在世界坐标中的左上角。 */
export function cellPos(g: Grid, r: number, c: number): { x: number; y: number } {
  return { x: c * g.cellW, y: r * g.cellH }
}

/** 含某世界坐标点的单元(floor);越界返回 null。 */
export function cellAtWorld(g: Grid, wx: number, wy: number): { row: number; col: number } | null {
  if (wx < 0 || wy < 0 || wx >= g.imgW || wy >= g.imgH) return null
  return { row: Math.floor(wy / g.cellH), col: Math.floor(wx / g.cellW) }
}

/** 把一个世界坐标点吸到最近的单元行列(round),裁剪到合法范围。 */
export function nearestCell(g: Grid, wx: number, wy: number): { row: number; col: number } {
  return {
    row: clamp(Math.round(wy / g.cellH), 0, g.rows - 1),
    col: clamp(Math.round(wx / g.cellW), 0, g.cols - 1),
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
