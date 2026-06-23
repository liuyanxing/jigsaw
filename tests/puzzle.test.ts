import { describe, it, expect } from 'vitest'
import { makeGrid } from '../src/core/grid'
import { generatePuzzle } from '../src/core/puzzle'

describe('puzzle 生成', () => {
  it('order 是所有格的一个置换,长度 = rows*cols', () => {
    const g = makeGrid(1200, 1600, 4, 4)
    const s = generatePuzzle(g, 'img', 123)
    expect(s.order.length).toBe(16)
    expect([...s.order].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i))
  })

  it('同种子 → 同 order(可复现)', () => {
    const g = makeGrid(1200, 1600, 4, 4)
    expect(generatePuzzle(g, 'img', 999).order).toEqual(generatePuzzle(g, 'img', 999).order)
  })

  it('不同种子 → order 不同', () => {
    const g = makeGrid(1200, 1600, 6, 6)
    expect(generatePuzzle(g, 'img', 1).order).not.toEqual(generatePuzzle(g, 'img', 2).order)
  })

  it('初始不是已完成态', () => {
    const g = makeGrid(900, 1200, 3, 3)
    const s = generatePuzzle(g, 'img', 7)
    expect(s.order.every((p, i) => p === i)).toBe(false)
  })
})
