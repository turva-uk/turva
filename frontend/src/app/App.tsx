import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider, Outlet, Navigate } from 'react-router';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import ResourceNotFoundPage from '../pages/ResourceNotFoundPage/ResourceNotFoundPage';
import DashboardLayout from '../layouts/DashboardLayout/DashboardLayout';
import { UserAuthContext, UserAuthProvider } from './contexts/UserAuthContext';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import { ConfigurationProvider } from './contexts/ConfigurationContext';
import AuthenticationLayout from '../pages/AuthenticationPages/AuthenticationLayout';
import LoginPage from '../pages/AuthenticationPages/LoginPage/LoginPage';
import CreateAccountPage from '../pages/AuthenticationPages/CreateAccountPage/CreateAccountPage';
import ForgotPasswordPage from '../pages/AuthenticationPages/ForgotPasswordPage/ForgotPasswordPage';
import { useContext } from 'react';
import VerifyAccountPage from '#src/pages/AuthenticationPages/VerifyAccountPage/VerifyAccountPage.tsx';
import VerifyNoticePage from '#src/pages/AuthenticationPages/VerifyNoticePage/VerifyNoticePage.tsx';

const RequiresVerifiedLogin = () => {
  const { user } = useContext(UserAuthContext);

  if (!user?.id) {
    // Redirect to login page or show a message
    return <Navigate to="/auth" />;
  }

  if (!user?.isVerified) {
    return <Navigate to="/auth/verify-notice" />;
  }

  return <Outlet />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/auth" element={<AuthenticationLayout />}>
        <Route index element={<LoginPage />} />,
        <Route path="register" element={<CreateAccountPage />} />,
        <Route path="forgot" element={<ForgotPasswordPage />} />
        <Route path="verify" element={<VerifyAccountPage />} />
        <Route path="verify-notice" element={<VerifyNoticePage />} />
      </Route>
      <Route path="/" element={<RequiresVerifiedLogin />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="templates" element={<div>Templates</div>} />
          <Route path="organisations" element={<div>Organisations</div>} />
        </Route>
      </Route>
      <Route path="*" element={<ResourceNotFoundPage />} />
    </>
  ), { basename: import.meta.env.BASE_URL }
)

const App = () => (
  <UserAuthProvider>
    <MantineProvider theme={theme} defaultColorScheme='dark'>
      <ConfigurationProvider>
        <Notifications />
        <RouterProvider router={router} />
      </ConfigurationProvider>
    </MantineProvider>
  </UserAuthProvider>
)

export default App
