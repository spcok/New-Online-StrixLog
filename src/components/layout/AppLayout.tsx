// ============================================================================
// File: src/components/layout/AppLayout.tsx
// ============================================================================
import React from 'react';
import { useLocation } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  // Isolate the Login view from the App Shell
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Protected Application Shell (Strictly identical Tailwind rendering)
  return (
    <div className="flex h-screen bg-[#0A0B0E]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}