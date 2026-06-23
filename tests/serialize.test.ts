import { describe, it, expect } from 'vitest'
import { makeGrid } from '../src/core/grid'
import { generatePuzzle } from '../src/core/puzzle'
import { serialize, deserialize } from '../src/core/serialize'

describe('serialize', () => {
  it('order 与元数据往返一致', () => {
    const g = makeGrid(1200, 1600, 4, 3)
    const s = generatePuzzle(g, 'imgX', 42)
    s.elapsedMs = 5000
    s.moves = 7
    const restored = deserialize(serialize(s))
    expect(restored.seed).toBe(42)
    expect(restored.imageId).toBe('imgX')
    expect(restored.elapsedMs).toBe(5000)
    expect(restored.moves).toBe(7)
    expect(restored.order).toEqual(s.order)
  })
})
