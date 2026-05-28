import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { queryClient } from './lib/db';
import { QueryClientProvider } from '@tanstack/react-query';

// ElectricSQL orphaned boot sequence eliminated.
// Hydration logic is explicitly delegated to the SyncEngine component in the router.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);