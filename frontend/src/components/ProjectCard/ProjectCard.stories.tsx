import preview from "#.storybook/preview";
import fetchMock from "fetch-mock";
import ProjectCard from "./ProjectCard";

const meta = preview.meta({
  title: "Components/Project Card",
  component: ProjectCard,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => {
      fetchMock.hardReset();
      fetchMock.mockGlobal();

      return <Story />;
    },
  ],
  args: {
    imageUrl:
      "https://peopleshistorynhs.org/wp-content/uploads/2016/01/nhs-logo-880x4951.jpeg",
    title: "DCB0129",
    description:
      "Clinical Risk Management: its Application in the Manufacture of Health IT Systems",
    lastUpdated: new Date("2025-10-24"),
    createdBy: "John Doe",
  },
});

export const Default = meta.story();
