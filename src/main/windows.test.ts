import { describe, it, expect, vi } from 'vitest'
import {
  buildWindowOptions,
  shouldFocusSecondInstance,
  applyDisplayMode
} from './windows'

describe('buildWindowOptions', () => {
  it('fullscreen 模式启用 kiosk', () => {
    const opts = buildWindowOptions('fullscreen')
    expect(opts.kiosk).toBe(true)
    expect(opts.webPreferences!.partition).toBe('persist:kiosk')
    expect(opts.webPreferences!.contextIsolation).toBe(true)
    expect(opts.webPreferences!.nodeIntegration).toBe(false)
    expect(opts.webPreferences!.sandbox).toBe(true)
  })

  it('maximized 模式不启用 kiosk', () => {
    const opts = buildWindowOptions('maximized')
    expect(opts.kiosk).toBe(false)
  })

  it('normal 模式不启用 kiosk', () => {
    const opts = buildWindowOptions('normal')
    expect(opts.kiosk).toBe(false)
  })
})

describe('shouldFocusSecondInstance', () => {
  it('已有窗口时返回 true', () => {
    expect(shouldFocusSecondInstance(true)).toBe(true)
  })

  it('无窗口时返回 false', () => {
    expect(shouldFocusSecondInstance(false)).toBe(false)
  })
})

// 用最小 mock 的窗口对象验证 applyDisplayMode 的副作用调用,无需真实 Electron。
function mockWin() {
  return {
    setKiosk: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn(() => false)
  }
}

describe('applyDisplayMode', () => {
  it('fullscreen 进入 kiosk', () => {
    const win = mockWin()
    applyDisplayMode(win as any, 'fullscreen')
    expect(win.setKiosk).toHaveBeenCalledWith(true)
  })

  it('maximized 退出 kiosk 并最大化', () => {
    const win = mockWin()
    applyDisplayMode(win as any, 'maximized')
    expect(win.setKiosk).toHaveBeenCalledWith(false)
    expect(win.maximize).toHaveBeenCalled()
  })

  it('normal 退出 kiosk 并取消最大化', () => {
    const win = mockWin()
    applyDisplayMode(win as any, 'normal')
    expect(win.setKiosk).toHaveBeenCalledWith(false)
    expect(win.unmaximize).toHaveBeenCalled()
  })
})
