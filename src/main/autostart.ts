// 开机自启封装 —— 依赖 auto-launch(主进程运行时)。阶段 7 补 TDD。
import AutoLaunch from 'auto-launch'
import { app } from 'electron'

let launcher: AutoLaunch | null = null

function getLauncher(): AutoLaunch {
  if (!launcher) {
    launcher = new AutoLaunch({ name: app.getName(), path: app.getPath('exe') })
  }
  return launcher
}

export async function setAutoStart(enabled: boolean): Promise<void> {
  const l = getLauncher()
  if (enabled) await l.enable()
  else await l.disable()
}

export async function getAutoStart(): Promise<boolean> {
  return getLauncher().isEnabled()
}
