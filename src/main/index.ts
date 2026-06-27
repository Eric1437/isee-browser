import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, shell } from 'electron'
import { join } from 'node:path'
import { buildWindowOptions } from './windows'
import { getSettings } from './settings-store'
import { createSettingsWindow, getSettingsWindow } from './settings-window'
import { registerIpcHandlers } from './ipc'
import { initUpdater, checkForUpdates } from './updater'
import { isAllowedNavigation } from './nav-guard'
import { registerDownloadHandler } from './downloads'
import { setAutoStart } from './autostart'

let contentWindow: BrowserWindow | null = null
let tray: Tray | null = null
let updateTimer: NodeJS.Timeout | null = null

function createContentWindow() {
  const settings = getSettings()
  const win = new BrowserWindow(buildWindowOptions(settings.displayMode))
  win.loadURL(settings.defaultUrl)

  // Kiosk 导航锁定:仅允许同 host / allowlist 内导航,拦截其余跳转。
  win.webContents.on('will-navigate', (e, url) => {
    const s = getSettings()
    if (!isAllowedNavigation(url, s.defaultUrl, s.urlAllowlist)) {
      e.preventDefault()
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    const s = getSettings()
    if (s.update.openExternalLinks && /^https?:/.test(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // 文件下载:按设置询问保存位置或存入默认目录。
  registerDownloadHandler(
    win.webContents.session,
    settings.download.defaultFolder,
    settings.download.alwaysAsk
  )

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
    registerIpcHandlers({
      reloadContentWindow: () => contentWindow?.reload(),
      loadUrlInContentWindow: (url) => contentWindow?.loadURL(url)
    })
    createContentWindow()
    createTray()
  // 逗号键在 Electron accelerator 中是字面量 ",",不是 "Comma"(后者会解析失败)。
  globalShortcut.register('CommandOrControl+Shift+,', () => openSettings())

    // 开机自启:启动时按设置同步系统注册项,确保与用户偏好一致。
    void setAutoStart(getSettings().autoStart)

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
