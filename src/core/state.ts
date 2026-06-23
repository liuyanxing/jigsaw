import { type PuzzleState } from './puzzle'

/** 已归位(在自己 home 格)的块数。 */
export function correctCount(s: PuzzleState): number {
  let n = 0
  for (let i = 0; i < s.order.length; i++) if (s.order[i] === i) n++
  return n
}

export function totalCount(s: PuzzleState): number {
  return s.order.length
}

/** 解出:每块都在 home 格。 */
export function isComplete(s: PuzzleState): boolean {
  return s.order.every((p, i) => p === i)
}
