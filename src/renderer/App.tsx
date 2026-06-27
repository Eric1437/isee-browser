import { SettingsForm } from './components/SettingsForm'
import { UpdatePanel } from './components/UpdatePanel'
import './styles.css'

export function App() {
  return (
    <div className="app">
      <h1>isee-browser 设置</h1>
      <SettingsForm />
      <hr />
      <UpdatePanel />
    </div>
  )
}
