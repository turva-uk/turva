import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider, useNavigate, Routes, Outlet, Navigate } from 'react-router';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import ResourceNotFoundPage from '../pages/ResourceNotFoundPage/ResourceNotFoundPage';
import LandingPage from '../pages/LandingPage/LandingPage';
import DashboardLayout from '../layouts/DashboardLayout/DashboardLayout';
import { UserAuthContext, UserAuthProvider } from './contexts/UserAuthContext';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import { ConfigurationProvider } from './contexts/ConfigurationContext';
import AuthenticationLayout from '../layouts/AuthenticationLayout/AuthenticationLayout';
import LoginPage from '../pages/AuthenticationPages/LoginPage/LoginPage';
import CreateAccountPage from '../pages/AuthenticationPages/CreateAccountPage/CreateAccountPage';
import ForgotPasswordPage from '../pages/AuthenticationPages/ForgotPasswordPage/ForgotPasswordPage';
import { useContext } from 'react';

const RequiresLogin = () => {
  const { user } = useContext(UserAuthContext);

  if (!user?.id) {
    // Redirect to login page or show a message
    return <Navigate to="/app/auth" />;
  }

  return <Outlet />;
}

// const RequiresPlatformAdministrator = () => {
//   const { user } = useContext(UserAuthContext);

//   if (!user?.id) {
//     // Redirect to login page or show a message
//     return <Navigate to="/app/auth" />;
//   }

//   return <Outlet />;
// }

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/auth" element={<AuthenticationLayout />}>
        <Route index element={<LoginPage />} />,
        <Route path="register" element={<CreateAccountPage />} />,
        <Route path="forgot" element={<ForgotPasswordPage />} />
      </Route>
      {/* <Route path="/app/admin" element={<RequiresPlatformAdministrator />}>
        <Route index element={<div>Admin Dashboard</div>} />
      </Route> */}
      <Route path="/app" element={<RequiresLogin />}>
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
    <ConfigurationProvider>
      <MantineProvider theme={theme}>
        <Notifications />
        <RouterProvider router={router} />
      </MantineProvider>
    </ConfigurationProvider>
  </UserAuthProvider>
)

export default App
