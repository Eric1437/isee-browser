import { describe, it, expect } from 'vitest'
import { buildClearOptions } from './storage'

describe('buildClearOptions', () => {
  it('默认清除全部存储类型与配额', () => {
    const o = buildClearOptions()
    expect(o.storages).toContain('localstorage')
    expect(o.storages).toContain('cookies')
    expect(o.storages).toContain('indexdb')
    expect(o.storages).toContain('serviceworkers')
    expect(o.storages).toContain('cachestorage')
    expect(o.quotas).toContain('temporary')
    expect(o.quotas).toContain('persistent')
  })
})
