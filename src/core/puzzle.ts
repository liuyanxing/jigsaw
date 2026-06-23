import { type Grid } from './grid'
import { mulberry32, shuffle } from './rng'

// 玩法:所有矩形块打乱后铺满网格(无托盘)。order 是一个置换:
//   order[cellIndex] = 该格当前所放块的 id;块 id 即它的 home 单元序号。
// 解出 = order 为恒等(每块都在自己的 home 格)。

export interface PuzzleState {
  seed: number
  rows: number
  cols: number
  imageId: string
  order: number[] // 长度 rows*cols 的置换
  elapsedMs: number
  moves: number
}

export function cellIndex(cols: number, r: number, c: number): number {
  return r * cols + c
}
export function homeRow(cols: number, pieceId: number): number {
  return Math.floor(pieceId / cols)
}
export function homeCol(cols: number, pieceId: number): number {
  return pieceId % cols
}

/** 生成打乱的网格(种子可复现);避免初始即完成。 */
export function generatePuzzle(grid: Grid, imageId: string, seed: number): PuzzleState {
  const n = grid.rows * grid.cols
  const order = Array.from({ length: n }, (_, i) => i)
  shuffle(order, mulberry32(seed))
  if (n > 1 && order.every((p, i) => p === i)) {
    const t = order[0]
    order[0] = order[1]
    order[1] = t
  }
  return { seed, rows: grid.rows, cols: grid.cols, imageId, order, elapsedMs: 0, moves: 0 }
}
