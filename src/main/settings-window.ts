// 设置窗口创建 —— 依赖 electron 运行时,与纯函数 windows.ts 分离以便测试。
import { BrowserWindow } from 'electron'
import { join } from 'node:path'

let settingsWindow: BrowserWindow | null = null

export function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 760,
    height: 800,
    title: '设置',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/settings.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void settingsWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void settingsWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}
