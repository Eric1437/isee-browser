import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage } from 'electron'
import { join } from 'node:path'
import { buildWindowOptions } from './windows'
import { getSettings } from './settings-store'
import { createSettingsWindow, getSettingsWindow } from './settings-window'
import { registerIpcHandlers } from './ipc'
import { initUpdater, checkForUpdates } from './updater'

let contentWindow: BrowserWindow | null = null
let tray: Tray | null = null
let updateTimer: NodeJS.Timeout | null = null

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
      { label: '检查更新', click: () => void checkForUpdates() },
      { type: 'separator' },
      { label: '重启', click: () => app.relaunch() },
      { label: '退出', click: () => app.quit() }
    ])
  )
}

function openSettings() {
  createSettingsWindow()
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
    registerIpcHandlers()
    createContentWindow()
    createTray()
    globalShortcut.register('CommandOrControl+Shift+Comma', () => openSettings())

    // 自动更新:初始化事件转发;若启用则启动检查 + 每 4 小时复查。
    initUpdater(() => {
      const wins: BrowserWindow[] = []
      if (getSettingsWindow()) wins.push(getSettingsWindow()!)
      return wins
    })
    if (getSettings().update.autoCheck) {
      void checkForUpdates()
      updateTimer = setInterval(() => void checkForUpdates(), 4 * 60 * 60 * 1000)
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    if (updateTimer) clearInterval(updateTimer)
  })
}
