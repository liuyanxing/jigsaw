import { type PuzzleState } from './puzzle'

// 存档:置换 order + seed/图/计时/步数 即可完整还原(与画布分辨率无关)。

export interface SavedState {
  v: number
  seed: number
  rows: number
  cols: number
  imageId: string
  elapsedMs: number
  moves: number
  order: number[]
}

export function serialize(s: PuzzleState): SavedState {
  return {
    v: 2,
    seed: s.seed,
    rows: s.rows,
    cols: s.cols,
    imageId: s.imageId,
    elapsedMs: s.elapsedMs,
    moves: s.moves,
    order: [...s.order],
  }
}

export function deserialize(saved: SavedState): PuzzleState {
  return {
    seed: saved.seed,
    rows: saved.rows,
    cols: saved.cols,
    imageId: saved.imageId,
    order: [...saved.order],
    elapsedMs: saved.elapsedMs,
    moves: saved.moves,
  }
}
