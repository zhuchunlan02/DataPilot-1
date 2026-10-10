import ReactDOM from 'react-dom/client'
import '@/styles/index.css'
import '@/styles/legacy.css'
import './legacy/data.js'
import App from './App'
import { initLegacy } from './legacy/app.js'

const root = document.getElementById('smart-agent-root')
if (!root) throw new Error('Smart Agent mount point not found')

ReactDOM.createRoot(root).render(<App />)
window.setTimeout(() => {
  initLegacy()
}, 0)
