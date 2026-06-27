// 本地存储清除 —— 依赖 electron session(主进程运行时)。阶段 6 补 TDD。
import { session } from 'electron'

type StorageType =
  | 'localstorage'
  | 'cookies'
  | 'indexdb'
  | 'serviceworkers'
  | 'cachestorage'

// 生成 clearStorageData 选项。纯函数,便于单测。
export function buildClearOptions() {
  const storages: StorageType[] = [
    'localstorage',
    'cookies',
    'indexdb',
    'serviceworkers',
    'cachestorage'
  ]
  const quotas: ('temporary' | 'persistent')[] = ['temporary', 'persistent']
  return { storages, quotas }
}

export async function clearStorage(): Promise<void> {
  const ses = session.fromPartition('persist:kiosk')
  await ses.clearStorageData(buildClearOptions())
}
