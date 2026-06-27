import { describe, it, expect } from 'vitest'
import { isAllowedNavigation } from './nav-guard'

describe('isAllowedNavigation', () => {
  it('同 host 放行', () => {
    expect(isAllowedNavigation('https://a.com/x', 'https://a.com/', [])).toBe(true)
  })

  it('不同 host 且无 allowlist 拦截', () => {
    expect(isAllowedNavigation('https://b.com/', 'https://a.com/', [])).toBe(false)
  })

  it('allowlist 命中放行', () => {
    expect(isAllowedNavigation('https://b.com/', 'https://a.com/', ['https://b.com/'])).toBe(true)
  })

  it('allowlist 非空但未命中拦截', () => {
    expect(isAllowedNavigation('https://c.com/', 'https://a.com/', ['https://b.com/'])).toBe(false)
  })

  it('非法 URL 拦截', () => {
    expect(isAllowedNavigation('not-a-url', 'https://a.com/', [])).toBe(false)
  })
})
