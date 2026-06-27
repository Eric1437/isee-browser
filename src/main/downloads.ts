// 文件下载处理 —— resolveDownloadPath 为纯函数(可单测),registerDownloadHandler 依赖 electron 运行时。
import { dialog, Notification, type DownloadItem, type Session } from 'electron'
import { join, posix } from 'node:path'

// 解析下载保存路径。alwaysAsk 为真时返回 'ask' 标记,否则拼接默认目录。
// 使用 posix 分隔符以保持纯函数跨平台行为一致(实际保存由 handler 用系统分隔符处理)。
export function resolveDownloadPath(
  defaultFolder: string,
  alwaysAsk: boolean,
  filename: string
): string | 'ask' {
  if (alwaysAsk) return 'ask'
  return defaultFolder ? posix.join(defaultFolder, filename) : filename
}

export function registerDownloadHandler(
  session: Session,
  defaultFolder: string,
  alwaysAsk: boolean
): void {
  session.on('will-download', async (_e, item: DownloadItem) => {
    if (alwaysAsk) {
      const r = await dialog.showSaveDialog({
        defaultPath: join(defaultFolder || '', item.getFilename())
      })
      if (r.canceled) {
        item.cancel()
        return
      }
      item.setSavePath(r.filePath)
    } else if (defaultFolder) {
      item.setSavePath(join(defaultFolder, item.getFilename()))
    }

    new Notification({ title: '下载开始', body: item.getFilename() }).show()
    item.once('done', () => {
      new Notification({ title: '下载完成', body: item.getFilename() }).show()
    })
  })
}
