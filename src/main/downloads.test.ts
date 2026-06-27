import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({
  dialog: { showSaveDialog: vi.fn() },
  Notification: vi.fn(() => ({ show: vi.fn() }))
}))

import { resolveDownloadPath } from './downloads'

describe('resolveDownloadPath', () => {
  it('alwaysAsk 返回 ask 标记', () => {
    expect(resolveDownloadPath('/dl', true, 'a.zip')).toBe('ask')
  })

  it('不询问返回拼接路径', () => {
    const p = resolveDownloadPath('/dl', false, 'a.zip')
    expect(p).toBe('/dl/a.zip')
  })

  it('路径为空且不询问时仍拼接', () => {
    expect(resolveDownloadPath('', false, 'a.zip')).toBe('a.zip')
  })
})
