// 更新状态共享类型 —— 主进程与渲染进程共用,无任何运行时依赖。
export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready'
  version?: string
  percent?: number
  error?: string
}

export const initialUpdateState: UpdateState = { status: 'idle' }

// 更新事件:由 electron-updater 的事件映射而来,作为纯函数 reduceUpdateEvent 的输入。
export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string }

// 纯状态机:根据事件将上一状态归约为下一状态。无副作用,便于单测。
export function reduceUpdateEvent(state: UpdateState, event: UpdateEvent): UpdateState {
  switch (event.type) {
    case 'checking':
      return { ...state, status: 'checking' }
    case 'available':
      return { status: 'available', version: event.version }
    case 'not-available':
      return { status: 'idle' }
    case 'downloading':
      return { ...state, status: 'downloading', percent: event.percent }
    case 'downloaded':
      return { status: 'ready', version: state.version }
    case 'error':
      return { status: 'idle', error: event.message }
  }
}
