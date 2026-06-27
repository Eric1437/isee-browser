// 应用设置共享类型 —— 主进程与渲染进程共用,无任何运行时依赖。
export type DisplayMode = 'fullscreen' | 'maximized' | 'normal'

export interface AppSettings {
  defaultUrl: string
  autoStart: boolean
  displayMode: DisplayMode
  download: { defaultFolder: string; alwaysAsk: boolean }
  update: { autoCheck: boolean; openExternalLinks: boolean }
  urlAllowlist: string[]
  gpu: { disabled: boolean }
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type SettingsPatch = DeepPartial<AppSettings>
