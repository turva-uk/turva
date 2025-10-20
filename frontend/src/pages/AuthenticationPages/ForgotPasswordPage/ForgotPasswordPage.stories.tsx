import preview from "#.storybook/preview";

import ForgotPasswordPage from "./ForgotPasswordPage";
import { MemoryRouter, Route, Routes } from "react-router";
import { MockUserAuthProvider } from "../../../app/contexts/UserAuthContext";
import AuthenticationLayout from "../AuthenticationLayout";
import fetchMock from "fetch-mock";
import { expect, waitFor } from "storybook/test";

const meta = preview.meta({
  title: "Pages/Auth/Forgot",
  component: ForgotPasswordPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MockUserAuthProvider>
        <MemoryRouter initialEntries={["/forgot"]}>
          <Routes>
            <Route path="/" element={<AuthenticationLayout />}>
              <Route path="forgot" element={<Story />} />,
            </Route>
          </Routes>
        </MemoryRouter>
      </MockUserAuthProvider>
    ),
  ],
});

export const SuccessfulRequest = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a successful login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        'end:/auth/forgot/', { status: 204 }, { delay: 500 }
      );
      
      return <Story />;
    }
  ]
});

export const UnsuccessfulRequest = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a failed login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        'end:/auth/forgot/', { status: 500, body: { detail: 'Server error' } }, { delay: 500 }
      );

      return <Story />;
    }
  ]
});

SuccessfulRequest.test("renders forgot password form", async ({ canvas }) => {
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const submitButton = await canvas.getByRole("button", { name: /send recovery email/i });

  // Check that all form elements are present
  expect(emailInput).toBeInTheDocument();
  expect(submitButton).toBeInTheDocument();
});

SuccessfulRequest.test("submits the form successfully", async ({ canvas, userEvent }) => {
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const submitButton = await canvas.getByRole("button", { name: /send recovery email/i });

  await userEvent.type(emailInput, "test@example.com");
  await userEvent.click(submitButton);

  // Check that the success message is displayed
  // const successMessage = await canvas.getByText(/if an account matching the email address you provided exists/i);
  await waitFor(async () => {
    const successMessage = await canvas.getByText(/if an account matching the email address you provided exists/i);
    expect(successMessage).toBeInTheDocument();
  });
});

UnsuccessfulRequest.test("handles server error on form submission", async ({ canvas, userEvent }) => {
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const submitButton = await canvas.getByRole("button", { name: /send recovery email/i });

  await userEvent.type(emailInput, "test@example.com");
  await userEvent.click(submitButton);

  // Check that the error message is displayed
  await waitFor(async () => {
    const errorMessage = await canvas.getByText(/an error occured sending the recovery email/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
