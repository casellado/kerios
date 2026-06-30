import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './ui/App.tsx';
import './ui/styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root non trovato in index.html');

// basename dal base di Vite: '' su Cloudflare (root '/'), '/kerios' su GitHub Pages
// (project site sotto /<repo>/) → i path mantengono il prefisso e il refresh funziona.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(root).render(
  <StrictMode>
    {/* BrowserRouter con path veri: Cloudflare via public/_redirects, GitHub Pages via 404.html. */}
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
