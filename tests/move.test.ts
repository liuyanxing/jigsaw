import { describe, it, expect } from 'vitest'
import { applyGroupMove } from '../src/core/move'

describe('move 落子/交换', () => {
  it('单块平移 = 两格互换', () => {
    // 2x2 cols=2,order=[0,1,2,3];把 cell0 向右移到 cell1
    const r = applyGroupMove([0, 1, 2, 3], 2, [0], 0, 1)
    expect(r.changed).toBe(true)
    expect(r.order).toEqual([1, 0, 2, 3])
  })

  it('整组平移 = 块交换(上行与下行互换)', () => {
    // 2x2,组 {0,1}(上行)整体下移 (1,0) → 目标 {2,3}
    const r = applyGroupMove([0, 1, 2, 3], 2, [0, 1], 1, 0)
    expect(r.order).toEqual([2, 3, 0, 1])
  })

  it('零位移不改变', () => {
    const r = applyGroupMove([0, 1, 2, 3], 2, [0], 0, 0)
    expect(r.changed).toBe(false)
    expect(r.order).toEqual([0, 1, 2, 3])
  })

  it('结果仍是合法置换', () => {
    const r = applyGroupMove([3, 2, 1, 0], 2, [0, 2], 0, 1) // 左列组右移一格
    expect([...r.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
  })
})
