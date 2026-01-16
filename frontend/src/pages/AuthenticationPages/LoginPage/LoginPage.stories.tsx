import preview from "#.storybook/preview";

import LoginPage from "./LoginPage";
import { MemoryRouter, Route, Routes } from "react-router";
import { MockUserAuthProvider } from "../../../app/contexts/UserAuthContext";
import AuthenticationLayout from "../AuthenticationLayout";
import { expect } from "storybook/test";
import fetchMock from "fetch-mock";

const meta = preview.meta({
  title: "Pages/Auth/Login",
  component: LoginPage,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MockUserAuthProvider>
        <MemoryRouter initialEntries={["/auth"]}>
          <Routes>
            <Route index element={<div>Login successful</div>} />
            <Route path="/auth" element={<AuthenticationLayout />}>
              <Route index element={<Story />} />,
            </Route>
          </Routes>
        </MemoryRouter>
      </MockUserAuthProvider>
    ),
  ],
});

export const SuccessfulLogin = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a successful login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        "end:/auth/login/",
        {
          id: "123",
          firstName: "John",
          lastName: "Doe",
          emailAddress: "john.doe@example.com",
        },
        { delay: 500 },
      );

      return <Story />;
    },
  ],
});

export const UnsuccessfulLogin = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a failed login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        "end:/auth/login/",
        {},
        {
          delay: 500,
          response: {
            status: 401,
            detail: "Invalid email address or password",
          },
        },
      );

      return <Story />;
    },
  ],
});

SuccessfulLogin.test("renders login form", async ({ canvas }) => {
  const emailInput = await canvas.getByLabelText("Email");
  const passwordInput = await canvas.getByLabelText("Password");
  const signInButton = await canvas.getByRole("button", { name: "Sign in" });

  // Check that the form elements are rendered
  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
  expect(signInButton).toBeInTheDocument();
});

SuccessfulLogin.test(
  "shows validation errors on empty submit",
  async ({ canvas }) => {
    const signInButton = await canvas.getByRole("button", { name: "Sign in" });

    // Click the sign-in button without filling the form
    await signInButton.click();

    // Check for validation error messages
    const emailError = await canvas.findByText("Invalid email address");
    const passwordError = await canvas.findByText("Password is required");

    expect(emailError).toBeInTheDocument();
    expect(passwordError).toBeInTheDocument();
  },
);

SuccessfulLogin.test(
  "successful login redirects to dashboard",
  async ({ canvas, userEvent }) => {
    const emailInput = await canvas.getByLabelText("Email");
    const passwordInput = await canvas.getByLabelText("Password");
    const signInButton = await canvas.getByRole("button", { name: "Sign in" });

    // Fill in the form with valid data
    await userEvent.type(emailInput, "valid@example.com");
    await userEvent.type(passwordInput, "validpassword");

    // Click the sign-in button
    await signInButton.click();

    // Wait for navigation to the dashboard
    await canvas.findByText("Login successful");

    // Check the route has changed to the dashboard
    expect(window.location.pathname).toBe("/");
  },
);

UnsuccessfulLogin.test(
  "unsuccessful login shows error message",
  async ({ canvas, userEvent }) => {
    const emailInput = await canvas.getByLabelText("Email");
    const passwordInput = await canvas.getByLabelText("Password");
    const signInButton = await canvas.getByRole("button", { name: "Sign in" });

    // Fill in the form with invalid data
    await userEvent.type(emailInput, "invalid@example.com");
    await userEvent.type(passwordInput, "invalidpassword");

    // Click the sign-in button
    await signInButton.click();

    // Check for error message
    const errorMessage = await canvas.findByText(
      "Invalid email address or password",
    );
    expect(errorMessage).toBeInTheDocument();
  },
);
