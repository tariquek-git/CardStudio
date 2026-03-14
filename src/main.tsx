import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CardConfigProvider } from './context'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CardConfigProvider>
      <App />
    </CardConfigProvider>
  </StrictMode>,
)
