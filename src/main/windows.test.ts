import { describe, it, expect } from 'vitest'
import { buildWindowOptions, shouldFocusSecondInstance } from './windows'

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
