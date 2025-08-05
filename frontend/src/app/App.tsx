import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import ResourceNotFoundPage from '../pages/ResourceNotFoundPage/ResourceNotFoundPage';
import LandingPage from '../pages/LandingPage/LandingPage';
import DashboardLayout from '../layouts/DashboardLayout/DashboardLayout';
import { MockUserAuthProvider } from './contexts/UserAuthContext';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import { ConfigurationProvider } from './contexts/ConfigurationContext';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/auth" element={<div>Auth Layout</div>}>
        <Route index element={<div>Login</div>} />,
        <Route path="register" element={<div>Register</div>} />,
        <Route path="forgot-password" element={<div>Forgot Password</div>} />
      </Route>
      <Route path="/app">
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="templates" element={<div>Templates</div>} />
          <Route path="settings" element={<div>Settings</div>} />
        </Route>
      </Route>

      <Route path="*" element={<ResourceNotFoundPage />} />
    </>
  ), { basename: import.meta.env.BASE_URL }
)

const App = () => (
  <MockUserAuthProvider>
    <ConfigurationProvider>
      <MantineProvider theme={theme}>
        <Notifications />
        <RouterProvider router={router} />
      </MantineProvider>
    </ConfigurationProvider>
  </MockUserAuthProvider>
)

export default App
