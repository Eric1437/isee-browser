import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage } from 'electron'
import { join } from 'node:path'
import { buildWindowOptions } from './windows'
import { getSettings } from './settings-store'

let contentWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createContentWindow() {
  const settings = getSettings()
  const win = new BrowserWindow(buildWindowOptions(settings.displayMode))
  win.loadURL(settings.defaultUrl)
  contentWindow = win
}

function createTray() {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('isee-browser')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '设置', click: () => openSettings() },
      { label: '刷新页面', click: () => contentWindow?.reload() },
      { label: '检查更新', click: () => openSettings() /* 阶段 8 接入 */ },
      { type: 'separator' },
      { label: '重启', click: () => app.relaunch() },
      { label: '退出', click: () => app.quit() }
    ])
  )
}

function openSettings() {
  // 阶段 3 实现 createSettingsWindow
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (contentWindow) {
      if (contentWindow.isMinimized()) contentWindow.restore()
      contentWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createContentWindow()
    createTray()
    globalShortcut.register('CommandOrControl+Shift+Comma', () => openSettings())
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
