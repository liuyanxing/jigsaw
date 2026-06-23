import { describe, it, expect } from 'vitest'
import { isComplete, correctCount, totalCount } from '../src/core/state'
import { type PuzzleState } from '../src/core/puzzle'

function st(order: number[]): PuzzleState {
  return { seed: 1, rows: 2, cols: 2, imageId: 'x', order, elapsedMs: 0, moves: 0 }
}

describe('state', () => {
  it('isComplete:order 为恒等才完成', () => {
    expect(isComplete(st([0, 1, 2, 3]))).toBe(true)
    expect(isComplete(st([1, 0, 2, 3]))).toBe(false)
  })

  it('correctCount:在 home 格的块数', () => {
    expect(correctCount(st([0, 3, 2, 1]))).toBe(2)
    expect(totalCount(st([0, 3, 2, 1]))).toBe(4)
  })
})
