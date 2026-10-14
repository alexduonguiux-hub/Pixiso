import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { appStore } from './state/store.js';
import './styles.css';

window.__pixiso = { store: appStore, scene: null };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
