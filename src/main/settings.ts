// 设置类型与校验 —— 类型来自 shared(主进程与渲染进程共用),此处提供默认值与校验。
export type { AppSettings, DisplayMode, SettingsPatch } from '../shared/settings-types'

import type { AppSettings, SettingsPatch } from '../shared/settings-types'

export const defaultSettings: AppSettings = {
  defaultUrl: 'https://example.com',
  autoStart: false,
  displayMode: 'fullscreen',
  download: { defaultFolder: '', alwaysAsk: true },
  update: { autoCheck: true, openExternalLinks: false },
  urlAllowlist: [],
  gpu: { disabled: false }
}

const URL_RE = /^https?:\/\/.+/
const MODES: readonly string[] = ['fullscreen', 'maximized', 'normal']

// 校验并合并部分设置,失败抛错。纯函数。
export function validateSettings(input: SettingsPatch): AppSettings {
  const merged: AppSettings = {
    ...defaultSettings,
    ...(input as Partial<AppSettings>),
    download: { ...defaultSettings.download, ...(input.download ?? {}) },
    update: { ...defaultSettings.update, ...(input.update ?? {}) },
    gpu: { ...defaultSettings.gpu, ...(input.gpu ?? {}) }
  }
  if (!URL_RE.test(merged.defaultUrl)) {
    throw new Error('defaultUrl 必须为 http/https 地址')
  }
  if (!MODES.includes(merged.displayMode)) {
    throw new Error('displayMode 非法')
  }
  if (typeof merged.download.alwaysAsk !== 'boolean') {
    throw new Error('download.alwaysAsk 必须为布尔')
  }
  if (typeof merged.update.autoCheck !== 'boolean') {
    throw new Error('update.autoCheck 必须为布尔')
  }
  if (typeof merged.update.openExternalLinks !== 'boolean') {
    throw new Error('update.openExternalLinks 必须为布尔')
  }
  if (typeof merged.autoStart !== 'boolean') {
    throw new Error('autoStart 必须为布尔')
  }
  if (!Array.isArray(merged.urlAllowlist)) {
    throw new Error('urlAllowlist 必须为数组')
  }
  return merged
}
