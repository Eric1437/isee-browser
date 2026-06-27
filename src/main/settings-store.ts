// 设置持久化存储 —— 依赖 electron-store(主进程运行时)。与纯校验逻辑分离,便于测试。
import Store from 'electron-store'
import { defaultSettings, validateSettings, type AppSettings } from './settings'

export type SettingsPatch = Partial<AppSettings>

let store: Store<AppSettings> | null = null

function getStore(): Store<AppSettings> {
  if (!store) {
    store = new Store<AppSettings>({ defaults: defaultSettings })
  }
  return store
}

export function getSettings(): AppSettings {
  return validateSettings(getStore().store)
}

export function setSettings(partial: SettingsPatch): AppSettings {
  const s = getStore()
  const next = validateSettings({ ...s.store, ...partial })
  s.store = next
  return next
}

// 仅供测试:重置内部 store 实例。
export function _resetStoreForTest(): void {
  store = null
}
