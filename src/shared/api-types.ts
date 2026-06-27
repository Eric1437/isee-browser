// settingsApi 接口共享类型 —— 主进程与渲染进程共用,无运行时依赖。
import type { AppSettings, SettingsPatch } from './settings-types'
import type { UpdateState } from './updater-types'

export interface SettingsApi {
  getSettings: () => Promise<AppSettings>
  setSettings: (patch: SettingsPatch) => Promise<AppSettings>
  checkForUpdates: () => Promise<unknown>
  downloadUpdate: () => Promise<unknown>
  installUpdate: () => Promise<void>
  getUpdateStatus: () => Promise<UpdateState>
  onUpdateStatus: (cb: (status: UpdateState) => void) => () => void
  toggleAutoStart: (enabled: boolean) => Promise<void>
  clearStorage: () => Promise<void>
  selectDownloadFolder: () => Promise<string | null>
}
