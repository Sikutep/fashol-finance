import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingProvider } from './context/LoadingContext';
import LoadingShowcase from './components/LoadingShowcase';

const rootElement = document.getElementById('root') || document.getElementById('app');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <LoadingProvider>
        <LoadingShowcase />
      </LoadingProvider>
    </React.StrictMode>
  );
}

export { LoadingProvider, useLoading } from './context/LoadingContext';
export { default as LoadingModal } from './components/LoadingModal';
export { default as LoadingShowcase } from './components/LoadingShowcase';
