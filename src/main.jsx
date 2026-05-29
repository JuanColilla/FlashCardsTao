import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Polyfill window.storage using localStorage
if (!window.storage) {
  window.storage = {
    get: (key) => Promise.resolve(
      localStorage.getItem(key) != null
        ? { value: localStorage.getItem(key) }
        : null
    ),
    set: (key, value) => {
      localStorage.setItem(key, value)
      return Promise.resolve()
    },
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
