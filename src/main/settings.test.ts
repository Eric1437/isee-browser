import { describe, it, expect } from 'vitest'
import { validateSettings, defaultSettings, type AppSettings } from './settings'

describe('validateSettings', () => {
  it('非法 URL 被拒', () => {
    expect(() => validateSettings({ ...defaultSettings, defaultUrl: 'not-a-url' })).toThrow()
  })

  it('非 http/https 协议被拒', () => {
    expect(() => validateSettings({ ...defaultSettings, defaultUrl: 'ftp://x' })).toThrow()
  })

  it('displayMode 枚举校验', () => {
    expect(() => validateSettings({ ...defaultSettings, displayMode: 'big' as any })).toThrow()
  })

  it('download.alwaysAsk 布尔校验', () => {
    expect(() =>
      validateSettings({
        ...defaultSettings,
        download: { defaultFolder: '', alwaysAsk: 'yes' as any }
      })
    ).toThrow()
  })

  it('合法设置通过', () => {
    const s = validateSettings({ ...defaultSettings, defaultUrl: 'https://example.com' })
    expect(s.defaultUrl).toBe('https://example.com')
  })

  it('缺省值填充', () => {
    const s = validateSettings({} as Partial<AppSettings>)
    expect(s.displayMode).toBe('fullscreen')
    expect(s.autoStart).toBe(false)
    expect(s.download.alwaysAsk).toBe(true)
    expect(s.update.autoCheck).toBe(true)
  })

  it('深合并 download/update 子对象', () => {
    const s = validateSettings({ download: { defaultFolder: '/dl' } })
    expect(s.download.defaultFolder).toBe('/dl')
    expect(s.download.alwaysAsk).toBe(true) // 缺省保留
  })
})
