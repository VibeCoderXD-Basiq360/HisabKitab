import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/authStore';
import { useFCM } from './hooks/useFCM';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import HomePage from './pages/home/HomePage';
import AddEditExpensePage from './pages/expense/AddEditExpensePage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import BalancesPage from './pages/balances/BalancesPage';
import SettingsPage from './pages/settings/SettingsPage';
import CategoriesPage from './pages/settings/CategoriesPage';
import PeoplePage from './pages/settings/PeoplePage';
import PaymentTypesPage from './pages/settings/PaymentTypesPage';
import ProfilePage from './pages/profile/ProfilePage';

function Protected({ children }) {
  const jwt = useAuthStore((s) => s.jwt);
  return jwt ? children : <Navigate to="/login" replace />;
}

function FCMSetup() {
  const jwt = useAuthStore((s) => s.jwt);
  useFCM(!!jwt);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <FCMSetup />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Protected><HomePage /></Protected>} />
          <Route path="/expense/new" element={<Protected><AddEditExpensePage /></Protected>} />
          <Route path="/expense/:id" element={<Protected><AddEditExpensePage /></Protected>} />
          <Route path="/analytics" element={<Protected><AnalyticsPage /></Protected>} />
          <Route path="/balances" element={<Protected><BalancesPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/settings/categories" element={<Protected><CategoriesPage /></Protected>} />
          <Route path="/settings/people" element={<Protected><PeoplePage /></Protected>} />
          <Route path="/settings/payment-types" element={<Protected><PaymentTypesPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
