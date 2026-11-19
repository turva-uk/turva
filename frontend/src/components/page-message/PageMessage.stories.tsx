/**
 * PageMessage Component Stories
 *
 * Demonstrates the centralised page message display system.
 * Shows messages rendered above page content via PageMessageProvider.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider } from "react-router";
import { MantineProvider } from "@mantine/core";
import { theme, cssVariablesResolver } from "@/theme";
import { PageMessageProvider, usePageMessage } from "./PageMessageContext";
import PageMessageDisplay from "./PageMessageDisplay";
import { useEffect } from "react";
import { VariantStack, VariantRow } from "@/stories/variants";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface DemoProps {
  messages: Array<{
    variant: "success" | "partial_success" | "error";
    title: string;
    description?: string;
  }>;
}

function DemoContent({ messages }: DemoProps) {
  const { showMessage } = usePageMessage();

  useEffect(() => {
    messages.forEach((msg) => showMessage(msg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function renderStory(messages: DemoProps["messages"]) {
  function StoryPage() {
    return (
      <PageMessageProvider>
        <PageMessageDisplay />
        <DemoContent messages={messages} />
      </PageMessageProvider>
    );
  }

  const router = createMemoryRouter([{ path: "*", element: <StoryPage /> }], {
    initialEntries: ["/"],
  });

  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <RouterProvider router={router} />
    </MantineProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Meta                                                               */
/* ------------------------------------------------------------------ */

const meta: Meta = {
  title: "Page message/Page message",
  parameters: {
    layout: "padded",
    disableDefaultRouter: true,
  },
};

export default meta;
type Story = StoryObj;

/* ------------------------------------------------------------------ */
/*  Stories                                                             */
/* ------------------------------------------------------------------ */

export const SingleSuccess: Story = {
  render: () =>
    renderStory([
      {
        variant: "success",
        title: "Organisation deleted",
        description: "North Norfolk Medical Centre has been removed.",
      },
    ]),
};

export const SingleError: Story = {
  render: () =>
    renderStory([
      {
        variant: "error",
        title: "Failed to delete organisation",
        description: "The server returned an error. Please try again.",
      },
    ]),
};

export const PartialSuccess: Story = {
  render: () =>
    renderStory([
      {
        variant: "partial_success",
        title: "Site partially updated",
        description: "Name was saved but address update failed.",
      },
    ]),
};

export const MultipleMessages: Story = {
  render: () =>
    renderStory([
      {
        variant: "success",
        title: "Staff member added",
        description: "Dr Smith has been added to the organisation.",
      },
      {
        variant: "error",
        title: "Failed to send notification",
        description: "Email delivery failed. The user has still been added.",
      },
    ]),
};

export const NoDescription: Story = {
  render: () => renderStory([{ variant: "success", title: "Site removed" }]),
};

export const AllVariants: Story = {
  render: () => {
    function AllVariantsPage() {
      return (
        <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
          <VariantStack>
            <VariantRow label="success">
              {renderStory([
                {
                  variant: "success",
                  title: "Action completed successfully",
                },
              ])}
            </VariantRow>
            <VariantRow label="partial_success">
              {renderStory([
                {
                  variant: "partial_success",
                  title: "Partially completed",
                  description: "Some items were not processed.",
                },
              ])}
            </VariantRow>
            <VariantRow label="error">
              {renderStory([
                {
                  variant: "error",
                  title: "Operation failed",
                  description: "Please try again or contact support.",
                },
              ])}
            </VariantRow>
          </VariantStack>
        </MantineProvider>
      );
    }
    return <AllVariantsPage />;
  },
};
