import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { useAppStore } from './store/appStore'

registerSW({ immediate: true })

useAppStore.subscribe((s) => {
  document.documentElement.lang = s.language
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
