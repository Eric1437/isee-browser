import type { SettingsApi } from '../shared/api-types'

// 渲染进程访问设置 API 的统一入口。
export const settingsApi: SettingsApi = (window as unknown as { settingsApi: SettingsApi })
  .settingsApi
