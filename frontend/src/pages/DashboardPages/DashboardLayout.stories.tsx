import preview from "#.storybook/preview";

import { MemoryRouter, Route, Routes } from "react-router";
import {
  MockUserAuthProvider,
  MockUserCSOAuthProvider,
} from "../../app/contexts/UserAuthContext";
import fetchMock from "fetch-mock";
import DashboardLayout from "./DashboardLayout";
import { Box } from "@mantine/core";

const meta = preview.meta({
  title: "Pages/Dashboard/Layout",
  component: DashboardLayout,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Story />}>
            <Route index element={<Box>Content</Box>} />,
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

export const LoggedInCSOUser = meta.story({
  decorators: [
    (Story) => (
      <MockUserCSOAuthProvider>
        <Story />
      </MockUserCSOAuthProvider>
    ),
  ],
});

export const LoggedOutUser = meta.story({
  decorators: [(Story) => <Story />],
});
