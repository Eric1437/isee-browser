// 自动更新编排 —— 依赖 electron-updater(主进程运行时)。状态转换委托纯函数 reduceUpdateEvent。
import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from 'electron-log'
import {
  initialUpdateState,
  reduceUpdateEvent,
  type UpdateState,
  type UpdateEvent
} from '../shared/updater-types'

export type { UpdateState } from '../shared/updater-types'
export { initialUpdateState, reduceUpdateEvent } from '../shared/updater-types'

let state: UpdateState = initialUpdateState
const subscribers = new Set<(s: UpdateState) => void>()

function emit(event: UpdateEvent): void {
  state = reduceUpdateEvent(state, event)
  for (const fn of subscribers) fn(state)
}

export function getUpdateState(): UpdateState {
  return state
}

export function onUpdateStatus(fn: (s: UpdateState) => void): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function initUpdater(getWindows: () => BrowserWindow[]): void {
  autoUpdater.logger = log
  autoUpdater.on('checking-for-update', () => emit({ type: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    emit({ type: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => emit({ type: 'not-available' }))
  autoUpdater.on('download-progress', (p) =>
    emit({ type: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', () => emit({ type: 'downloaded' }))
  autoUpdater.on('error', (e) => emit({ type: 'error', message: String(e) }))
  // 转发给所有设置窗口
  onUpdateStatus((s) => getWindows().forEach((w) => w.webContents.send('update:status', s)))
}

export function checkForUpdates(): Promise<unknown> {
  return autoUpdater.checkForUpdates()
}

export function downloadUpdate(): Promise<unknown> {
  return autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
