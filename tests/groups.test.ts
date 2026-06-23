import { describe, it, expect } from 'vitest'
import { computeGroups, groupCells } from '../src/core/groups'

describe('groups 分组(相邻同 offset)', () => {
  it('已解出 → 全网格一个组', () => {
    const g = computeGroups([0, 1, 2, 3], 2, 2)
    expect(g.count).toBe(1)
  })

  it('相对位置正确的相邻块成一组,其余各自独立', () => {
    // 2x2:cell0=块0, cell1=块1(都在 home → offset(0,0),相邻 → 同组)
    //      cell2=块3, cell3=块2(offset 各为 (0,-1)/(0,1) → 各自独立)
    const order = [0, 1, 3, 2]
    const g = computeGroups(order, 2, 2)
    expect(g.count).toBe(3)
    expect(groupCells(g, 0)).toEqual([0, 1])
    expect(groupCells(g, 2)).toEqual([2])
    expect(groupCells(g, 3)).toEqual([3])
  })

  it('整块平移但内部相对正确 → 仍是一个组(offset 非 0)', () => {
    // 3x3:把 2x2 左上块整体放到右下(相对位置仍正确)
    // home 块: 0 1 / 3 4 (在 3 列网格里 id: 0,1,3,4)
    // 放到右下 cells 4,5,7,8
    const order = [8, 6, 7, 2, 0, 1, 5, 3, 4]
    const g = computeGroups(order, 3, 3)
    // 块0在cell4,块1在cell5,块3在cell7,块4在cell8,offset 都是 (1,1) → 连通成一组
    expect(g.id[4]).toBe(g.id[5])
    expect(g.id[4]).toBe(g.id[7])
    expect(g.id[4]).toBe(g.id[8])
  })
})
