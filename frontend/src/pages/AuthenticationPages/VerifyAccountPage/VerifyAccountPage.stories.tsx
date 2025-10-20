import preview from "#.storybook/preview";

import VerifyAccountPage from "./VerifyAccountPage";
import { MemoryRouter, Route, Routes } from "react-router";
import { MockUserAuthProvider } from "../../../app/contexts/UserAuthContext";
import AuthenticationLayout from "../AuthenticationLayout";
import fetchMock from "fetch-mock";
import { reactRouterParameters } from 'storybook-addon-remix-react-router';

const meta = preview.meta({
  title: "Pages/Auth/VerifyAccountPage",
  component: VerifyAccountPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MockUserAuthProvider>
        <MemoryRouter initialEntries={["/auth/verify"]}>
          <Routes>
            <Route index element={<div>Login successful</div>} />
            <Route path="/auth/verify" element={<AuthenticationLayout />}>
              <Route index element={<Story />} />,
            </Route>
          </Routes>
        </MemoryRouter>
      </MockUserAuthProvider>
    ),
    // withRouter
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
  ],
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        searchParams: { 
          user_id: '1',
          token: 'valid-token'
        },
      },
    }),
  }
});

// export const UnsuccessfulResend = meta.story({
//   decorators: [
//     (Story) => {
//       // Mock the fetch API to simulate a failed login response
//       fetchMock.hardReset();
//       fetchMock.mockGlobal();
//       fetchMock.post(
//         'end:/auth/verify/1/',
//         {},
//         { delay: 500, response: { status: 401, detail: 'Invalid email address or password' } }
//       );

//       return <Story />;
//     }
//   ]
// });

// ResendSuccessful.test("renders button to resend", async ({ canvas }) => {
//   // Check the verify API was called with correct parameters
  
//   await expect(fetchMock.callHistory.callLogs.length).toBe(1);
//   await expect(fetchMock.callHistory.callLogs[0].url).toContain('/auth/verify/1/');
// });
