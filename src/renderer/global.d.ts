import type { SettingsApi } from '../shared/api-types'

declare global {
  interface Window {
    settingsApi: SettingsApi
  }
}

export {}
