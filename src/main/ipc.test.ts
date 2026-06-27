import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock 主进程依赖,使 ipc.ts 可在 jsdom 测试环境加载。
const fakeHandlers: Record<string, (e: unknown, ...a: unknown[]) => unknown> = {}
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (e: unknown, ...a: unknown[]) => unknown) => {
      fakeHandlers[channel] = fn
    }
  },
  dialog: { showOpenDialog: vi.fn() }
}))

vi.mock('./settings-store', () => ({
  getSettings: vi.fn(() => ({ defaultUrl: 'https://example.com' })),
  setSettings: vi.fn((p: unknown) => p)
}))
vi.mock('./autostart', () => ({ setAutoStart: vi.fn(async () => undefined) }))
vi.mock('./storage', () => ({ clearStorage: vi.fn(async () => undefined) }))
vi.mock('./updater', () => ({
  checkForUpdates: vi.fn(async () => undefined),
  downloadUpdate: vi.fn(async () => undefined),
  installUpdate: vi.fn(() => undefined),
  getUpdateState: vi.fn(() => ({ status: 'idle' })),
  onUpdateStatus: vi.fn(() => () => {})
}))

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    Object.keys(fakeHandlers).forEach((k) => delete fakeHandlers[k])
  })

  it('settings:get 返回设置', async () => {
    const { registerIpcHandlers } = await import('./ipc')
    registerIpcHandlers()
    const result = await fakeHandlers['settings:get']({})
    expect(result).toEqual({ defaultUrl: 'https://example.com' })
  })

  it('settings:set 委托 setSettings', async () => {
    const { registerIpcHandlers } = await import('./ipc')
    const { setSettings } = await import('./settings-store')
    registerIpcHandlers()
    await fakeHandlers['settings:set']({}, { defaultUrl: 'https://new.com' })
    expect(setSettings).toHaveBeenCalledWith({ defaultUrl: 'https://new.com' })
  })

  it('autostart:toggle 传递布尔', async () => {
    const { registerIpcHandlers } = await import('./ipc')
    const { setAutoStart } = await import('./autostart')
    registerIpcHandlers()
    await fakeHandlers['autostart:toggle']({}, true)
    expect(setAutoStart).toHaveBeenCalledWith(true)
  })

  it('update:status 返回当前状态', async () => {
    const { registerIpcHandlers } = await import('./ipc')
    registerIpcHandlers()
    const result = await fakeHandlers['update:status']({})
    expect(result).toEqual({ status: 'idle' })
  })
})
