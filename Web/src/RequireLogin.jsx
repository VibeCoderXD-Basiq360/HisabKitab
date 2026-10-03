import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_KEY, useCurrentUser } from './hooks/useAuth.js';
import styles from './RequireLogin.module.css';

// Wraps every screen that needs a session. Someone logged out is sent to
// /login, and brought back to where they were once they log in.
export function RequireLogin() {
  const { data: user, isPending, isError } = useCurrentUser();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Wipes what was cached for the person whose session ended. It runs after
  // their screens have closed, so nothing on screen refetches what is removed.
  // "Who am I" stays — removing it would make it fetch again. Finished form
  // submissions go too: they keep what was typed, including passwords.
  useEffect(() => {
    if (user !== null) return;
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== CURRENT_USER_KEY[0] });
    queryClient.getMutationCache().clear();
  }, [user, queryClient]);

  if (isPending) return null;
  if (isError) {
    return <p className={styles.message}>HisabKitab could not be reached. Check your connection and reload.</p>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
