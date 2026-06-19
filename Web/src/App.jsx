import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useFCM } from './hooks/useFCM';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import HomePage from './pages/home/HomePage';
import AddEditExpensePage from './pages/expense/AddEditExpensePage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import CategoryExpensesPage from './pages/analytics/CategoryExpensesPage';
import PaymentExpensesPage from './pages/analytics/PaymentExpensesPage';
import BalancesPage from './pages/balances/BalancesPage';
import PersonExpensesPage from './pages/balances/PersonExpensesPage';
import SettingsPage from './pages/settings/SettingsPage';
import CategoriesPage from './pages/settings/CategoriesPage';
import PeoplePage from './pages/settings/PeoplePage';
import PaymentTypesPage from './pages/settings/PaymentTypesPage';
import RecurringPage from './pages/settings/RecurringPage';
import BudgetsPage from './pages/settings/BudgetsPage';
import CategoryBudgetPage from './pages/settings/CategoryBudgetPage';
import ExportPage from './pages/settings/ExportPage';
import ProfilePage from './pages/profile/ProfilePage';
import GroupsPage from './pages/groups/GroupsPage';
import CreateGroupPage from './pages/groups/CreateGroupPage';
import GroupDetailPage from './pages/groups/GroupDetailPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import CalendarPage from './pages/calendar/CalendarPage';
import ImportPage from './pages/settings/ImportPage';
import ActivityPage from './pages/activity/ActivityPage';
import BalanceHistoryPage from './pages/balances/BalanceHistoryPage';
import SavingsGoalPage from './pages/settings/SavingsGoalPage';
import AppLockPage from './pages/settings/AppLockPage';
import LoansPage from './pages/loans/LoansPage';
import CreateLoanPage from './pages/loans/CreateLoanPage';
import LoanDetailPage from './pages/loans/LoanDetailPage';
import ExchangeRatesPage from './pages/settings/ExchangeRatesPage';
import CardDelegationsPage from './pages/settings/CardDelegationsPage';
import OfflineBar from './components/OfflineBar';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import LockScreen from './components/LockScreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLockStore } from './store/lockStore';

function Protected({ children }) {
  const jwt = useAuthStore((s) => s.jwt);
  return jwt ? children : <Navigate to="/login" replace />;
}

function FCMSetup() {
  const jwt = useAuthStore((s) => s.jwt);
  useFCM(!!jwt);
  return null;
}

function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}

function BackgroundLock() {
  const { enabled, setLocked } = useLockStore();
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && enabled) setLocked(true);
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, setLocked]);
  return null;
}

function DarkModeSync() {
  const dark = useThemeStore((s) => s.dark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DarkModeSync />
        <FCMSetup />
        <KeyboardShortcuts />
        <BackgroundLock />
        <LockScreen />
        <KeyboardShortcutsHelp />
        <OfflineBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Protected><HomePage /></Protected>} />
          <Route path="/expense/new" element={<Protected><AddEditExpensePage /></Protected>} />
          <Route path="/expense/:id" element={<Protected><AddEditExpensePage /></Protected>} />
          <Route path="/analytics" element={<Protected><AnalyticsPage /></Protected>} />
          <Route path="/analytics/category/:categoryId" element={<Protected><CategoryExpensesPage /></Protected>} />
          <Route path="/analytics/payment/:paymentTypeId" element={<Protected><PaymentExpensesPage /></Protected>} />
          <Route path="/balances" element={<Protected><BalancesPage /></Protected>} />
          <Route path="/balances/person/:personId" element={<Protected><PersonExpensesPage /></Protected>} />
          <Route path="/balances/history/:personId" element={<Protected><BalanceHistoryPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/settings/categories" element={<Protected><CategoriesPage /></Protected>} />
          <Route path="/settings/people" element={<Protected><PeoplePage /></Protected>} />
          <Route path="/settings/payment-types" element={<Protected><PaymentTypesPage /></Protected>} />
          <Route path="/settings/recurring" element={<Protected><RecurringPage /></Protected>} />
          <Route path="/settings/budgets" element={<Protected><BudgetsPage /></Protected>} />
          <Route path="/settings/budgets/:categoryId" element={<Protected><CategoryBudgetPage /></Protected>} />
          <Route path="/settings/export" element={<Protected><ExportPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/groups" element={<Protected><GroupsPage /></Protected>} />
          <Route path="/groups/new" element={<Protected><CreateGroupPage /></Protected>} />
          <Route path="/groups/:id" element={<Protected><GroupDetailPage /></Protected>} />
          <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/calendar" element={<Protected><CalendarPage /></Protected>} />
          <Route path="/settings/import" element={<Protected><ImportPage /></Protected>} />
          <Route path="/activity" element={<Protected><ActivityPage /></Protected>} />
          <Route path="/settings/savings-goal" element={<Protected><SavingsGoalPage /></Protected>} />
          <Route path="/settings/app-lock" element={<Protected><AppLockPage /></Protected>} />
          <Route path="/loans" element={<Protected><LoansPage /></Protected>} />
          <Route path="/loans/new" element={<Protected><CreateLoanPage /></Protected>} />
          <Route path="/loans/:id" element={<Protected><LoanDetailPage /></Protected>} />
          <Route path="/settings/exchange-rates" element={<Protected><ExchangeRatesPage /></Protected>} />
          <Route path="/settings/card-delegations" element={<Protected><CardDelegationsPage /></Protected>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
