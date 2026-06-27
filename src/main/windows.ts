import type { BrowserWindowConstructorOptions } from 'electron'
import type { DisplayMode } from './types'

// 构造内容窗口的 BrowserWindow 选项。纯函数,便于单测。
export function buildWindowOptions(
  displayMode: DisplayMode
): BrowserWindowConstructorOptions & { kiosk: boolean } {
  const base: BrowserWindowConstructorOptions = {
    width: 1280,
    height: 800,
    webPreferences: {
      partition: 'persist:kiosk',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  }
  return { ...base, kiosk: displayMode === 'fullscreen' }
}

// 是否应在 second-instance 事件中聚焦已有窗口。
export function shouldFocusSecondInstance(hasWindow: boolean): boolean {
  return hasWindow
}
