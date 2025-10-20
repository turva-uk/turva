import preview from "#.storybook/preview";

import { MemoryRouter, Route, Routes } from "react-router";
import { MockUserAuthProvider } from "../../app/contexts/UserAuthContext";
import AuthenticationLayout from "./AuthenticationLayout";
import CreateAccountPage from "./CreateAccountPage/CreateAccountPage";
import ForgotPasswordPage from "./ForgotPasswordPage/ForgotPasswordPage";
import LoginPage from "./LoginPage/LoginPage";
import fetchMock from "fetch-mock";

const meta = preview.meta({
  title: "Pages/Auth/Combined",
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  decorators: [
    () => (
      <MockUserAuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route index element={<>Dashboard Page</>} />
            <Route path="/" element={<AuthenticationLayout />}>
              <Route index element={<LoginPage />} />,
              <Route path="register" element={<CreateAccountPage />} />,
              <Route path="forgot" element={<ForgotPasswordPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </MockUserAuthProvider>
    ),
    (Story) => {
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post('end:/auth/login/', {
        id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        firstName: "Test",
        lastName: "User",
        email: "test.user@example.com"
      }, { delay: 500 });
      fetchMock.post('end:/auth/register/', 204, { delay: 500 });
      fetchMock.post('end:/auth/forgot/', 204, { delay: 500 });
      return <Story />;
    }
  ],
});

export const Default = meta.story();