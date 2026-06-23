import { type SavedState } from '../core/serialize'

// 平台层存储:localStorage 实现 serialize 的存/取。Android 换 DataStore/Room,接口一致。

const SAVE_KEY = 'jigsaw:save'

export function saveGame(saved: SavedState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved))
  } catch {
    // 忽略配额/隐私模式错误
  }
}

export function loadGame(): SavedState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as SavedState) : null
  } catch {
    return null
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}
