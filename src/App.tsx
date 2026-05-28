// ============================================================================
// File: src/App.tsx
// ============================================================================
import React from 'react';
import { createRouter, RouterProvider } from '@tanstack/react-router';

// Import the generated route tree layout configuration
import { routeTree } from './routeTree.gen';

// Standard instantiation. Authentication context is handled globally via Zustand.
const router = createRouter({
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <RouterProvider router={router} />
  );
}