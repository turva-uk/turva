import preview from "#.storybook/preview";

import { MemoryRouter, Route, Routes } from "react-router";
import { MockUserAuthProvider } from "../../../app/contexts/UserAuthContext";
import fetchMock from "fetch-mock";
import CommunityProjectsPage from "./CommunityProjectsPage";
import DashboardLayout from "../DashboardLayout";

const meta = preview.meta({
  title: "Pages/Dashboard/Community Projects",
  component: CommunityProjectsPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Story />} />,
          </Route>
        </Routes>
      </MemoryRouter>
    ),
    (Story) => {
      fetchMock.hardReset();
      fetchMock.mockGlobal();

      return <Story />;
    },
  ],
});

export const LoggedInUser = meta.story({
  decorators: [
    (Story) => (
      <MockUserAuthProvider>
        <Story />
      </MockUserAuthProvider>
    ),
  ],
});
