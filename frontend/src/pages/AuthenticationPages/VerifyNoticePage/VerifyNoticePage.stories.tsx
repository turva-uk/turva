import preview from "#.storybook/preview";

import VerifyNoticePage from "./VerifyNoticePage";
import { MemoryRouter, Route, Routes } from "react-router";
import { MockUserAuthProvider } from "../../../app/contexts/UserAuthContext";
import AuthenticationLayout from "../AuthenticationLayout";
import { expect } from "storybook/test";
import fetchMock from "fetch-mock";

const meta = preview.meta({
  title: "Pages/Auth/VerifyNoticePage",
  component: VerifyNoticePage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MockUserAuthProvider>
        <MemoryRouter initialEntries={["/auth/verify-notice"]}>
          <Routes>
            <Route index element={<div>Login successful</div>} />
            <Route path="/auth/verify-notice" element={<AuthenticationLayout />}>
              <Route index element={<Story />} />,
            </Route>
          </Routes>
        </MemoryRouter>
      </MockUserAuthProvider>
    ),
  ],
});

export const ResendSuccessful = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a successful login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        'end:/auth/verify/1/',
        {},
        { delay: 500, response: { status: 200 } }
      );

      return <Story />;
    }
  ]
});

export const UnsuccessfulResend = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a failed login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        'end:/auth/verify/1/',
        {},
        { delay: 500, response: { status: 401, detail: 'Invalid email address or password' } }
      );

      return <Story />;
    }
  ]
});

ResendSuccessful.test("renders button to resend", async ({ canvas }) => {
  const resendButton = await canvas.getByRole('button', { name: 'Resend Verification Email' });
  expect(resendButton).toBeDefined();
});

ResendSuccessful.test("clicking resend button triggers API call", async ({ canvas }) => {
  const resendButton = await canvas.getByRole('button', { name: 'Resend Verification Email' });
  await resendButton.click();

  // Wait for the success alert to appear
  const successAlert = await canvas.findByText(/A verification email has been sent to your email address/i);
  expect(successAlert).toBeDefined();

  // Check that the fetch mock was called
  expect(fetchMock.callHistory.callLogs.length).toBe(1);
  expect(fetchMock.callHistory.callLogs[0].url).toContain('/auth/verify/1/');
});

UnsuccessfulResend.test("shows error message on failed resend", async ({ canvas }) => {
  const resendButton = await canvas.getByRole('button', { name: 'Resend Verification Email' });
  await resendButton.click();

  // Wait for the error display to appear
  const errorDisplay = await canvas.findByText(/An error occurred while resending the verification email./i);
  expect(errorDisplay).toBeDefined();

  // Check that the fetch mock was called
  expect(fetchMock.callHistory.callLogs.length).toBe(1);
  expect(fetchMock.callHistory.callLogs[0].url).toContain('/auth/verify/1/');
});
