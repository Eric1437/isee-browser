import { useEffect, useState } from 'react'
import { settingsApi } from '../api'
import type { AppSettings, DisplayMode } from '../../shared/settings-types'

const DISPLAY_MODES: { value: DisplayMode; label: string }[] = [
  { value: 'fullscreen', label: '全屏(Kiosk)' },
  { value: 'maximized', label: '最大化' },
  { value: 'normal', label: '普通窗口' }
]

export function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void settingsApi.getSettings().then(setSettings)
  }, [])

  if (!settings) return <div>加载中…</div>

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings({ ...settings, [key]: value })
  }

  const handleSelectFolder = async () => {
    const folder = await settingsApi.selectDownloadFolder()
    if (folder) {
      setSettings({ ...settings, download: { ...settings.download, defaultFolder: folder } })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await settingsApi.setSettings(settings)
      setMessage('已保存')
    } catch (e) {
      setMessage(`保存失败:${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  // 清除 Kiosk 分区的浏览数据(localStorage/cookies/indexDB 等),主进程清除后会刷新内容窗口。
  const handleClearStorage = async () => {
    setClearing(true)
    setMessage(null)
    try {
      await settingsApi.clearStorage()
      setMessage('已清除浏览数据')
    } catch (e) {
      setMessage(`清除失败:${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setClearing(false)
    }
  }

  return (
    <section className="form-section">
      <h2>基本设置</h2>

      <label className="field">
        <span>默认地址</span>
        <input
          type="url"
          value={settings.defaultUrl}
          onChange={(e) => update('defaultUrl', e.target.value)}
          placeholder="https://example.com"
        />
      </label>

      <label className="field">
        <span>显示模式</span>
        <select
          value={settings.displayMode}
          onChange={(e) => update('displayMode', e.target.value as DisplayMode)}
        >
          {DISPLAY_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field check">
        <input
          type="checkbox"
          checked={settings.autoStart}
          onChange={(e) => update('autoStart', e.target.checked)}
        />
        <span>开机自启动</span>
      </label>

      <h2>下载</h2>
      <label className="field">
        <span>默认下载目录</span>
        <input
          type="text"
          value={settings.download.defaultFolder}
          readOnly
          placeholder="(未设置)"
        />
        <button type="button" onClick={handleSelectFolder}>
          选择目录
        </button>
      </label>

      <label className="field check">
        <input
          type="checkbox"
          checked={settings.download.alwaysAsk}
          onChange={(e) =>
            setSettings({
              ...settings,
              download: { ...settings.download, alwaysAsk: e.target.checked }
            })
          }
        />
        <span>每次下载询问保存位置</span>
      </label>

      <h2>浏览与更新</h2>
      <label className="field check">
        <input
          type="checkbox"
          checked={settings.update.openExternalLinks}
          onChange={(e) =>
            setSettings({
              ...settings,
              update: { ...settings.update, openExternalLinks: e.target.checked }
            })
          }
        />
        <span>外链用系统浏览器打开(否则拦截)</span>
      </label>

      <label className="field check">
        <input
          type="checkbox"
          checked={settings.update.autoCheck}
          onChange={(e) =>
            setSettings({
              ...settings,
              update: { ...settings.update, autoCheck: e.target.checked }
            })
          }
        />
        <span>自动检查更新</span>
      </label>

      <label className="field check">
        <input
          type="checkbox"
          checked={settings.gpu.disabled}
          onChange={(e) =>
            setSettings({ ...settings, gpu: { ...settings.gpu, disabled: e.target.checked } })
          }
        />
        <span>关闭硬件加速(部分 Linux 兼容)</span>
      </label>

      <h2>存储</h2>
      <div className="actions">
        <button type="button" onClick={handleClearStorage} disabled={clearing}>
          {clearing ? '清除中…' : '清除浏览数据'}
        </button>
        <span className="message">清除内容窗口的本地存储、Cookie、缓存等</span>
      </div>

      <div className="actions">
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存设置'}
        </button>
        {message && <span className="message">{message}</span>}
      </div>
    </section>
  )
}
