import { createBrowserRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import AnalyzePage from '@/pages/AnalyzePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';
import GenerateCvPage from '@/pages/dashboard/GenerateCvPage';
import { RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/analyze',
    element: <AnalyzePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard',
    element: (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    ),
  },
  {
    path: '/dashboard/profile',
    element: (
      <RequireAuth>
        <ProfilePage />
      </RequireAuth>
    ),
  },
  {
    path: '/dashboard/generate',
    element: (
      <RequireAuth>
        <GenerateCvPage />
      </RequireAuth>
    ),
  },
]);
