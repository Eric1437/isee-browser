// 更新状态共享类型 —— 主进程与渲染进程共用,无任何运行时依赖。
export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready'
  version?: string
  percent?: number
  error?: string
}

export const initialUpdateState: UpdateState = { status: 'idle' }
