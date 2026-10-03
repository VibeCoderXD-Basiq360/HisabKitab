import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { App } from './App.jsx';
import { CURRENT_USER_KEY } from './hooks/useAuth.js';
import './tokens.css';
import './global.css';

// A 401 while someone is logged in means their session has ended. Marking
// them logged out makes the login check send them to /login, and it wipes
// the cache once their screens have closed (see RequireLogin.jsx). A 401
// while nobody is logged in changes nothing — "who am I" answers 401 to every
// logged-out visitor.
function endSessionIfExpired(error) {
  if (error.status !== 401 || !queryClient.getQueryData(CURRENT_USER_KEY)) return;
  queryClient.setQueryData(CURRENT_USER_KEY, null);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: endSessionIfExpired }),
  mutationCache: new MutationCache({ onError: endSessionIfExpired }),
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
