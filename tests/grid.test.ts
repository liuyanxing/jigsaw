import { describe, it, expect } from 'vitest'
import { makeGrid, cellPos, cellAtWorld, nearestCell } from '../src/core/grid'

describe('grid', () => {
  it('从原图与行列算出单元尺寸', () => {
    const g = makeGrid(1200, 1600, 4, 3)
    expect(g.cellW).toBe(400)
    expect(g.cellH).toBe(400)
  })

  it('cellPos 给出世界坐标左上角', () => {
    const g = makeGrid(1200, 1600, 4, 3)
    expect(cellPos(g, 0, 0)).toEqual({ x: 0, y: 0 })
    expect(cellPos(g, 1, 2)).toEqual({ x: 800, y: 400 })
  })

  it('cellAtWorld 取含点单元(floor),越界返回 null', () => {
    const g = makeGrid(1200, 1600, 4, 3)
    expect(cellAtWorld(g, 10, 10)).toEqual({ row: 0, col: 0 })
    expect(cellAtWorld(g, 810, 410)).toEqual({ row: 1, col: 2 })
    expect(cellAtWorld(g, -1, 5)).toBeNull()
    expect(cellAtWorld(g, 1200, 5)).toBeNull()
  })

  it('nearestCell 吸到最近单元(round)并裁剪', () => {
    const g = makeGrid(1200, 1600, 4, 3)
    expect(nearestCell(g, 790, 410)).toEqual({ row: 1, col: 2 })
    expect(nearestCell(g, 99999, 99999)).toEqual({ row: 3, col: 2 })
  })
})
