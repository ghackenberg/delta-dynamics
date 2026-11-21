import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { init as initPlausible } from '@plausible-analytics/tracker'
import App from './App.tsx'
import './index.css'

initPlausible({
  domain: 'hackenberg.tech/delta-dynamics',
  endpoint: 'https://analytics.mentawise.com/api/event',
  hashBasedRouting: true,
  autoCapturePageviews: false,
  transformRequest: (payload) => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (nav.globalPrivacyControl === true || navigator.doNotTrack === '1') {
      return null
    }
    return payload
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
