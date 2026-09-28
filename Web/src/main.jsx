import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.jsx';
import './tokens.css';
import './global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    // A create that timed out may still have been saved. Retrying it could
    // record the same money twice.
    mutations: { retry: false },
    // A 4xx will fail the same way again. Only network and server errors are
    // worth another try.
    queries: {
      retry: (failureCount, error) => failureCount < 3 && !(error.status >= 400 && error.status < 500),
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
