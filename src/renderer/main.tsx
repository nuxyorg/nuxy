import React from 'react'
import ReactDOM from 'react-dom/client'
import ReactDOMBase from 'react-dom'
import App from './App'

window.React = React
window.ReactDOM = ReactDOMBase
// window.UI is populated by com.nuxy.ui-default (type: uikit) extension,
// which loads before the shell bootstrap. Initialize as empty so third-party
// uikit extensions that load with higher priority can merge safely.
window.UI = {}
window.__NUXY_DEV__ = import.meta.env.DEV

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
