import preview from "#.storybook/preview";

import CreateAccountPage from "./CreateAccountPage";
import { MemoryRouter, Route, Routes } from "react-router";
import { MockUserAuthProvider } from "../../../app/contexts/UserAuthContext";
import AuthenticationLayout from "../AuthenticationLayout";
import fetchMock from "fetch-mock";
import { expect } from "storybook/test";

const meta = preview.meta({
  title: "Pages/Auth/Register",
  component: CreateAccountPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MockUserAuthProvider>
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route index element={<div>Login successful</div>} />
            <Route path="/" element={<AuthenticationLayout />}>
              <Route path="register" element={<Story />} />,
            </Route>
          </Routes>
        </MemoryRouter>
      </MockUserAuthProvider>
    ),
  ],
});

export const SuccessfulCreation = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a successful login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        'end:/auth/register/', { status: 204 }, { delay: 500 }
      );
      
      return <Story />;
    }
  ]
});

export const UnsuccessfulCreation = meta.story({
  decorators: [
    (Story) => {
      // Mock the fetch API to simulate a failed login response
      fetchMock.hardReset();
      fetchMock.mockGlobal();
      fetchMock.post(
        'end:/auth/register/', { status: 409, body: { detail: 'Email already exists' } }, { delay: 500 }
      );

      return <Story />;
    }
  ]
});

SuccessfulCreation.test("renders registration form", async ({ canvas }) => {
  const firstNameInput = await canvas.getByRole("textbox", { name: /first name/i });
  const lastNameInput = await canvas.getByRole("textbox", { name: /last name/i });
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const passwordInput = await canvas.getByText("Password");
  const verifyPasswordInput = await canvas.getByText("Verify Password");
  const submitButton = await canvas.getByRole("button", { name: /register/i });

  // Check that all form elements are present
  expect(firstNameInput).toBeInTheDocument();
  expect(lastNameInput).toBeInTheDocument();
  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
  expect(verifyPasswordInput).toBeInTheDocument();
  expect(submitButton).toBeInTheDocument();
});

SuccessfulCreation.test("can register an account", async ({ canvas, userEvent }) => {
  const firstNameInput = await canvas.getByRole("textbox", { name: /first name/i });
  const lastNameInput = await canvas.getByRole("textbox", { name: /last name/i });
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const passwordInput = await canvas.getByText("Password");
  const verifyPasswordInput = await canvas.getByText("Verify Password");
  const submitButton = await canvas.getByRole("button", { name: /register/i });

  await userEvent.type(firstNameInput, "Test");
  await userEvent.type(lastNameInput, "User");
  await userEvent.type(emailInput, "test.user@example.com");
  await userEvent.type(passwordInput, "Password123");
  await userEvent.type(verifyPasswordInput, "Password123");
  await userEvent.click(submitButton);

  // Wait for the success message to appear
  await canvas.findByText(/a confirmation email has been sent/i);
});

SuccessfulCreation.test("checks for password mismatch", async ({ canvas, userEvent }) => {
  const firstNameInput = await canvas.getByRole("textbox", { name: /first name/i });
  const lastNameInput = await canvas.getByRole("textbox", { name: /last name/i });
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const passwordInput = await canvas.getByText("Password");
  const verifyPasswordInput = await canvas.getByText("Verify Password");
  const submitButton = await canvas.getByRole("button", { name: /register/i });

  await userEvent.type(firstNameInput, "Test");
  await userEvent.type(lastNameInput, "User");
  await userEvent.type(emailInput, "test.user@example.com");
  await userEvent.type(passwordInput, "Password123");
  await userEvent.type(verifyPasswordInput, "DifferentPassword");
  await userEvent.click(submitButton);

  // Check for the password mismatch error message
  const errorMessage = await canvas.findByText(/passwords do not match/i);
  expect(errorMessage).toBeInTheDocument();
});

SuccessfulCreation.test("checks for invalid email", async ({ canvas, userEvent }) => {
  const firstNameInput = await canvas.getByRole("textbox", { name: /first name/i });
  const lastNameInput = await canvas.getByRole("textbox", { name: /last name/i });
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const passwordInput = await canvas.getByText("Password");
  const verifyPasswordInput = await canvas.getByText("Verify Password");
  const submitButton = await canvas.getByRole("button", { name: /register/i });

  await userEvent.type(firstNameInput, "Test");
  await userEvent.type(lastNameInput, "User");
  await userEvent.type(emailInput, "invalid-email");
  await userEvent.type(passwordInput, "Password123");
  await userEvent.type(verifyPasswordInput, "Password123");
  await userEvent.click(submitButton);

  // Check for the invalid email error message
  const errorMessage = await canvas.findByText(/the email specified is not valid/i);
  expect(errorMessage).toBeInTheDocument();
});

SuccessfulCreation.test("checks for short password", async ({ canvas, userEvent }) => {
  const firstNameInput = await canvas.getByRole("textbox", { name: /first name/i });
  const lastNameInput = await canvas.getByRole("textbox", { name: /last name/i });
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const passwordInput = await canvas.getByText("Password");
  const verifyPasswordInput = await canvas.getByText("Verify Password");
  const submitButton = await canvas.getByRole("button", { name: /register/i });

  await userEvent.type(firstNameInput, "Test");
  await userEvent.type(lastNameInput, "User");
  await userEvent.type(emailInput, "test.user@example.com");
  await userEvent.type(passwordInput, "pass");
  await userEvent.type(verifyPasswordInput, "pass");
  await userEvent.click(submitButton);
});

SuccessfulCreation.test("checks first and last names are present", async ({ canvas, userEvent }) => {
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const passwordInput = await canvas.getByText("Password");
  const verifyPasswordInput = await canvas.getByText("Verify Password");
  const submitButton = await canvas.getByRole("button", { name: /register/i });

  await userEvent.type(emailInput, "test.user@example.com");
  await userEvent.type(passwordInput, "Password123");
  await userEvent.type(verifyPasswordInput, "Password123");
  await userEvent.click(submitButton);

  const firstNameError = await canvas.findByText(/first name must be at least 2 characters/i);
  const lastNameError = await canvas.findByText(/last name must be at least 2 characters/i);
  expect(firstNameError).toBeInTheDocument();
  expect(lastNameError).toBeInTheDocument();
});

UnsuccessfulCreation.test("shows error on failed registration", async ({ canvas, userEvent }) => {
  const firstNameInput = await canvas.getByRole("textbox", { name: /first name/i });
  const lastNameInput = await canvas.getByRole("textbox", { name: /last name/i });
  const emailInput = await canvas.getByRole("textbox", { name: /email/i });
  const passwordInput = await canvas.getByText("Password");
  const verifyPasswordInput = await canvas.getByText("Verify Password");
  const submitButton = await canvas.getByRole("button", { name: /register/i });

  await userEvent.type(firstNameInput, "Test");
  await userEvent.type(lastNameInput, "User");
  await userEvent.type(emailInput, "test.user@example.com");
  await userEvent.type(passwordInput, "Password123");
  await userEvent.type(verifyPasswordInput, "Password123");
  await userEvent.click(submitButton);

  // Wait for the error message to appear
  const errorMessage = await canvas.findByText(/email already exists/i);
  expect(errorMessage).toBeInTheDocument();
});
