// 自动更新编排 —— 依赖 electron-updater(主进程运行时)。阶段 8 补 TDD 与完整事件转发。
import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from 'electron-log'
import type { UpdateState } from '../shared/updater-types'

export type { UpdateState } from '../shared/updater-types'
export { initialUpdateState } from '../shared/updater-types'
import { initialUpdateState } from '../shared/updater-types'

let state: UpdateState = initialUpdateState
const subscribers = new Set<(s: UpdateState) => void>()

function emit(next: UpdateState) {
  state = next
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
  autoUpdater.on('checking-for-update', () => emit({ ...state, status: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    emit({ status: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => emit({ status: 'idle' }))
  autoUpdater.on('download-progress', (p) =>
    emit({ status: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', () =>
    emit({ status: 'ready', version: state.version })
  )
  autoUpdater.on('error', (e) => emit({ status: 'idle', error: String(e) }))
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
