// isee-browser 主进程入口 —— 阶段 0 占位空壳,阶段 1 替换为完整实现。
import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
  new BrowserWindow({ width: 800, height: 600, title: 'isee-browser' })
})
