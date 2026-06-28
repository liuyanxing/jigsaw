// 落子:把一组块整体平移 (vr,vc),被覆盖的外来块填入腾空的源格(整组交换)。
// 单块即 size=1 的组,退化为两格互换。调用方需保证平移后所有目标格在界内。

export interface MoveResult {
  order: number[]
  changed: boolean
}

export function applyGroupMove(
  order: number[],
  cols: number,
  cells: number[],
  vr: number,
  vc: number,
): MoveResult {
  if (vr === 0 && vc === 0) return { order: order.slice(), changed: false }
  const srcSet = new Set(cells)
  const targets = cells.map((c) => (Math.floor(c / cols) + vr) * cols + ((c % cols) + vc))
  const targetSet = new Set(targets)

  // 被挤出的外来块所在目标格(升序);腾空的源格(升序)
  const displacedCells = targets.filter((t) => !srcSet.has(t)).sort((a, b) => a - b)
  const freed = cells.filter((s) => !targetSet.has(s)).sort((a, b) => a - b)

  const next = order.slice()
  for (let k = 0; k < cells.length; k++) next[targets[k]] = order[cells[k]] // 组成员落到目标
  for (let k = 0; k < freed.length; k++) next[freed[k]] = order[displacedCells[k]] // 外来块填空
  return { order: next, changed: true }
}
