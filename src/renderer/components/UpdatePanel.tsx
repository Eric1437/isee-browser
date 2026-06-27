import { useEffect, useState } from 'react'
import { settingsApi } from '../api'
import type { UpdateState } from '../../shared/updater-types'

const STATUS_TEXT: Record<UpdateState['status'], string> = {
  idle: '当前已是最新版本',
  checking: '正在检查更新…',
  available: '发现新版本',
  downloading: '正在下载更新',
  ready: '更新已就绪,可重启安装'
}

export function UpdatePanel() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void settingsApi.getUpdateStatus().then(setState)
    const off = settingsApi.onUpdateStatus(setState)
    return off
  }, [])

  const handleCheck = async () => {
    setBusy(true)
    try {
      await settingsApi.checkForUpdates()
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = async () => {
    setBusy(true)
    try {
      await settingsApi.downloadUpdate()
    } finally {
      setBusy(false)
    }
  }

  const handleInstall = () => {
    void settingsApi.installUpdate()
  }

  return (
    <section className="form-section">
      <h2>更新</h2>
      <p className="update-status">
        {STATUS_TEXT[state.status]}
        {state.version ? `:${state.version}` : ''}
        {state.status === 'downloading' && state.percent != null ? ` ${state.percent}%` : ''}
      </p>

      <div className="actions">
        <button type="button" onClick={handleCheck} disabled={busy}>
          检查更新
        </button>
        {state.status === 'available' && (
          <button type="button" onClick={handleDownload} disabled={busy}>
            下载更新
          </button>
        )}
        {state.status === 'ready' && (
          <button type="button" onClick={handleInstall}>
            重启安装
          </button>
        )}
      </div>
    </section>
  )
}
