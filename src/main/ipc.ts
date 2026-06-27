// IPC 处理器注册 —— 委托各功能模块。为可测试,接受可注入的依赖。
import { ipcMain, dialog, type IpcMain } from 'electron'
import { getSettings, setSettings } from './settings-store'
import { setAutoStart } from './autostart'
import { clearStorage } from './storage'
import {
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getUpdateState,
  onUpdateStatus,
  type UpdateState
} from './updater'

export interface IpcDeps {
  ipc?: IpcMain
  getSettings?: typeof getSettings
  setSettings?: typeof setSettings
  setAutoStart?: typeof setAutoStart
  clearStorage?: typeof clearStorage
  selectDownloadFolder?: () => Promise<string | null>
  reloadContentWindow?: () => void
  checkForUpdates?: typeof checkForUpdates
  downloadUpdate?: typeof downloadUpdate
  installUpdate?: typeof installUpdate
  getUpdateState?: typeof getUpdateState
}

export function registerIpcHandlers(deps: IpcDeps = {}): void {
  const ipc = deps.ipc ?? ipcMain
  const get = deps.getSettings ?? getSettings
  const set = deps.setSettings ?? setSettings
  const auto = deps.setAutoStart ?? setAutoStart
  const clear = deps.clearStorage ?? clearStorage
  const selectFolder =
    deps.selectDownloadFolder ??
    (async () => {
      const r = await dialog.showOpenDialog({ properties: ['openDirectory'] })
      return r.canceled ? null : r.filePaths[0]
    })
  const reloadContent = deps.reloadContentWindow ?? (() => {})
  const check = deps.checkForUpdates ?? checkForUpdates
  const download = deps.downloadUpdate ?? downloadUpdate
  const install = deps.installUpdate ?? installUpdate
  const getStatus = deps.getUpdateState ?? getUpdateState

  ipc.handle('settings:get', () => get())
  ipc.handle('settings:set', (_e, patch) => set(patch))
  ipc.handle('autostart:toggle', async (_e, enabled: boolean) => {
    // 持久化设置后联动系统开机自启,二者保持一致。
    set({ autoStart: enabled })
    await auto(enabled)
  })
  ipc.handle('storage:clear', async () => {
    await clear()
    reloadContent()
  })
  ipc.handle('dialog:downloadFolder', () => selectFolder())
  ipc.handle('update:check', () => check())
  ipc.handle('update:download', () => download())
  ipc.handle('update:install', () => install())
  ipc.handle('update:status', () => getStatus())

  // 状态变更主动推送给渲染进程时,由 updater 模块直接 webContents.send;
  // 这里仅提供订阅入口供测试/调试使用。
  onUpdateStatus(() => {})
}

export type { UpdateState }
