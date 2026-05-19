import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as UI from '@nuxy/ui';

(window as any).React = React;
(window as any).UI = UI;
(window as any).__NUXY_DEV__ = import.meta.env.DEV;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
