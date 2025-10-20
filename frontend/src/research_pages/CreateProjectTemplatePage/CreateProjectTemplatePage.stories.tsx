import preview from "#.storybook/preview";
import { MockUserAuthProvider } from "#src/app/contexts/UserAuthContext.tsx";
import { MemoryRouter, Routes, Route } from "react-router";

import CreateProjectTemplatePage from "./CreateProjectTemplatePage";

const meta = preview.meta({
  title: "TestPages/CreateProjectTemplatePage",
  component: CreateProjectTemplatePage,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MockUserAuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route index element={<Story />} />
          </Routes>
        </MemoryRouter>
      </MockUserAuthProvider>
    ),
  ],
});

export const LoggedIn = meta.story();
