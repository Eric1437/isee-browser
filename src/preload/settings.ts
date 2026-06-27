import { contextBridge, ipcRenderer } from 'electron'
import type { SettingsApi } from '../shared/api-types'

// 受限、类型化的设置 API 桥,实现 shared 中定义的 SettingsApi 接口。
const settingsApi: SettingsApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),
  onUpdateStatus: (cb) => {
    const handler = (_: unknown, status: Parameters<typeof cb>[0]): void => cb(status)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
  toggleAutoStart: (enabled) => ipcRenderer.invoke('autostart:toggle', enabled),
  clearStorage: () => ipcRenderer.invoke('storage:clear'),
  selectDownloadFolder: () => ipcRenderer.invoke('dialog:downloadFolder')
}

contextBridge.exposeInMainWorld('settingsApi', settingsApi)

export type { SettingsApi }
