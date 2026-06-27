// 应用设置类型定义 —— 无 electron 依赖,便于在测试环境中导入。
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

export const defaultSettings: AppSettings = {
  defaultUrl: 'https://example.com',
  autoStart: false,
  displayMode: 'fullscreen',
  download: { defaultFolder: '', alwaysAsk: true },
  update: { autoCheck: true, openExternalLinks: false },
  urlAllowlist: [],
  gpu: { disabled: false }
}
