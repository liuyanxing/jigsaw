import { sys } from 'cc'
import { type LocationConfig } from '../config/levels'

// 关卡进度(Cocos 版):已完成子关 id 集合,sys.localStorage 持久化;顺序解锁。
// 逻辑与 Web 版一致,仅 localStorage → sys.localStorage(同 API,Android/iOS/Web 通用)。

const KEY = 'jigsaw:progress'

function load(): Set<string> {
  try {
    const raw = sys.localStorage.getItem(KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function save(set: Set<string>): void {
  try {
    sys.localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    // 忽略错误
  }
}

export function isCompleted(id: string): boolean {
  return load().has(id)
}

export function markCompleted(id: string): void {
  const set = load()
  if (!set.has(id)) {
    set.add(id)
    save(set)
  }
}

/** 顺序解锁:第 0 关永远解锁;其余需前一关已完成。 */
export function isUnlocked(loc: LocationConfig, i: number): boolean {
  if (i <= 0) return true
  const prev = loc.levels[i - 1]
  return !!prev && isCompleted(prev.id)
}

/** 第一个"已解锁且未完成"的子关序号;全部完成则返回最后一关。 */
export function currentIndex(loc: LocationConfig): number {
  for (let i = 0; i < loc.levels.length; i++) {
    if (isUnlocked(loc, i) && !isCompleted(loc.levels[i].id)) return i
  }
  return Math.max(0, loc.levels.length - 1)
}
