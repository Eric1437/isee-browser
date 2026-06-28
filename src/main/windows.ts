import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import type { DisplayMode } from './settings'

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

// 运行时切换已有内容窗口的显示模式,保存设置后立即生效,无需重启。
// fullscreen 进入 kiosk;maximized 退出 kiosk 并最大化;normal 退出 kiosk 并还原。
export function applyDisplayMode(win: BrowserWindow, mode: DisplayMode): void {
  if (mode === 'fullscreen') {
    win.setKiosk(true)
    return
  }
  win.setKiosk(false)
  if (mode === 'maximized') {
    win.maximize()
  } else {
    win.unmaximize()
  }
}
