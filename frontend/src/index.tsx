import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

import './styles/main.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

// Use hydrateRoot for pre-rendered pages (react-snap), createRoot for fresh renders
if (container.hasChildNodes()) {
  hydrateRoot(container,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
