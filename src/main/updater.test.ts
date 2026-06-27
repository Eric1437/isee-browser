import { describe, it, expect } from 'vitest'
import { reduceUpdateEvent, initialUpdateState } from '../shared/updater-types'

describe('reduceUpdateEvent', () => {
  it('idle -> checking', () => {
    expect(reduceUpdateEvent(initialUpdateState, { type: 'checking' }).status).toBe('checking')
  })

  it('checking -> available with version', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'checking' })
    const next = reduceUpdateEvent(s, { type: 'available', version: '2.0' })
    expect(next.status).toBe('available')
    expect(next.version).toBe('2.0')
  })

  it('available -> downloading with progress', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'available', version: '2.0' })
    const d = reduceUpdateEvent(s, { type: 'downloading', percent: 50 })
    expect(d.status).toBe('downloading')
    expect(d.percent).toBe(50)
  })

  it('downloading -> ready keeps version', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'available', version: '2.0' })
    const d = reduceUpdateEvent(s, { type: 'downloading', percent: 100 })
    expect(reduceUpdateEvent(d, { type: 'downloaded' }).status).toBe('ready')
    expect(reduceUpdateEvent(d, { type: 'downloaded' }).version).toBe('2.0')
  })

  it('not-available -> idle', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'checking' })
    expect(reduceUpdateEvent(s, { type: 'not-available' }).status).toBe('idle')
  })

  it('error -> idle with message', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'checking' })
    const next = reduceUpdateEvent(s, { type: 'error', message: '网络错误' })
    expect(next.status).toBe('idle')
    expect(next.error).toBe('网络错误')
  })
})
