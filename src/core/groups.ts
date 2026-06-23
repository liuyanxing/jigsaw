import { homeRow, homeCol } from './puzzle'

// 分组:网格中相邻、且两块"相对位置正确"(同一平移 offset)的块连成一组。
// 一块在格 i 的 offset = (curR - homeR, curC - homeC);相邻两格 offset 相同即彼此位置正确。

export interface Groups {
  id: number[] // groupId[cellIndex]
  count: number
}

function offsetKey(cols: number, cellIdx: number, pieceId: number): number {
  const dr = Math.floor(cellIdx / cols) - homeRow(cols, pieceId)
  const dc = (cellIdx % cols) - homeCol(cols, pieceId)
  return dr * 100000 + dc // 行列远小于 1e5,打包成一个可比较的数
}

export function computeGroups(order: number[], rows: number, cols: number): Groups {
  const n = rows * cols
  const id = new Array<number>(n).fill(-1)
  const off = new Array<number>(n)
  for (let i = 0; i < n; i++) off[i] = offsetKey(cols, i, order[i])
  let g = 0
  for (let start = 0; start < n; start++) {
    if (id[start] !== -1) continue
    const stack = [start]
    id[start] = g
    while (stack.length) {
      const c = stack.pop()!
      const r = Math.floor(c / cols)
      const col = c % cols
      const neigh: number[] = []
      if (r > 0) neigh.push(c - cols)
      if (r < rows - 1) neigh.push(c + cols)
      if (col > 0) neigh.push(c - 1)
      if (col < cols - 1) neigh.push(c + 1)
      for (const nb of neigh) {
        if (id[nb] === -1 && off[nb] === off[c]) {
          id[nb] = g
          stack.push(nb)
        }
      }
    }
    g++
  }
  return { id, count: g }
}

/** 与 cellIdx 同组的所有格(升序)。 */
export function groupCells(groups: Groups, cellIdx: number): number[] {
  const gid = groups.id[cellIdx]
  const out: number[] = []
  for (let i = 0; i < groups.id.length; i++) if (groups.id[i] === gid) out.push(i)
  return out
}
