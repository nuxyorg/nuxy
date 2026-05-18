import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as UI from '@nuxy/ui';
import './index.css';

(window as any).React = React;
(window as any).UI = UI;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
