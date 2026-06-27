import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AppSettings } from '../../../shared/settings-types'

const baseSettings: AppSettings = {
  defaultUrl: 'https://old.com',
  autoStart: false,
  displayMode: 'normal',
  download: { defaultFolder: '', alwaysAsk: true },
  update: { autoCheck: true, openExternalLinks: false },
  urlAllowlist: [],
  gpu: { disabled: false }
}

vi.mock('../../api', () => ({
  settingsApi: {
    getSettings: vi.fn(async () => ({ ...baseSettings })),
    setSettings: vi.fn(async (p: unknown) => p),
    selectDownloadFolder: vi.fn(async () => '/home/u/dl'),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    installUpdate: vi.fn(),
    getUpdateStatus: vi.fn(),
    onUpdateStatus: vi.fn(() => () => {}),
    toggleAutoStart: vi.fn(),
    clearStorage: vi.fn()
  }
}))

const { settingsApi } = await import('../../api')

describe('SettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('加载后显示已保存的默认地址', async () => {
    const { SettingsForm } = await import('../SettingsForm')
    render(<SettingsForm />)
    const input = (await screen.findByLabelText('默认地址')) as HTMLInputElement
    expect(input.value).toBe('https://old.com')
  })

  it('修改地址并保存', async () => {
    const { SettingsForm } = await import('../SettingsForm')
    render(<SettingsForm />)
    const input = (await screen.findByLabelText('默认地址')) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'https://new.com' } })
    fireEvent.click(screen.getByText('保存设置'))
    await waitFor(() => {
      expect(settingsApi.setSettings).toHaveBeenCalledWith(
        expect.objectContaining({ defaultUrl: 'https://new.com' })
      )
    })
  })

  it('点击选择目录后填充下载目录', async () => {
    const { SettingsForm } = await import('../SettingsForm')
    render(<SettingsForm />)
    await screen.findByLabelText('默认地址')
    fireEvent.click(screen.getByText('选择目录'))
    await waitFor(() => {
      expect(settingsApi.selectDownloadFolder).toHaveBeenCalled()
    })
  })
})
