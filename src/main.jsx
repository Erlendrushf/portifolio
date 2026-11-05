import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Keep consecutive filter edits in sync with the current route. */}
    <HashRouter useTransitions={false}>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
