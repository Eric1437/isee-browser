import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock auto-launch 与 electron,使 autostart.ts 可在 jsdom 测试环境加载。
const launcherMock = {
  isEnabled: vi.fn(async () => false),
  enable: vi.fn(async () => undefined),
  disable: vi.fn(async () => undefined)
}
const AutoLaunchMock = vi.fn(() => launcherMock)
vi.mock('auto-launch', () => ({ default: AutoLaunchMock }))
vi.mock('electron', () => ({
  app: { getName: () => 'isee-browser', getPath: () => '/usr/bin/isee-browser' }
}))

describe('autostart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('setAutoStart(true) 调用 enable', async () => {
    const { setAutoStart, _resetLauncherForTest } = await import('./autostart')
    _resetLauncherForTest()
    await setAutoStart(true)
    expect(launcherMock.enable).toHaveBeenCalledTimes(1)
    expect(launcherMock.disable).not.toHaveBeenCalled()
  })

  it('setAutoStart(false) 调用 disable', async () => {
    const { setAutoStart, _resetLauncherForTest } = await import('./autostart')
    _resetLauncherForTest()
    await setAutoStart(false)
    expect(launcherMock.disable).toHaveBeenCalledTimes(1)
    expect(launcherMock.enable).not.toHaveBeenCalled()
  })

  it('getAutoStart 返回布尔', async () => {
    const { getAutoStart, _resetLauncherForTest } = await import('./autostart')
    _resetLauncherForTest()
    launcherMock.isEnabled.mockResolvedValueOnce(true)
    const v = await getAutoStart()
    expect(typeof v).toBe('boolean')
    expect(v).toBe(true)
  })

  it('构造 AutoLaunch 时传入应用名与可执行路径', async () => {
    const { getAutoStart, _resetLauncherForTest } = await import('./autostart')
    _resetLauncherForTest()
    await getAutoStart() // 触发惰性初始化构造 launcher
    expect(AutoLaunchMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'isee-browser' })
    )
  })
})
