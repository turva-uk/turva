import { Alert, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { theme } from "./theme";

it("uses normal text colour for small alert headings, not low-contrast semantic ink", () => {
  render(
    <MantineProvider theme={theme}>
      <Alert color="yellow" title="Closing does not reduce risk">
        Recorded scores remain.
      </Alert>
    </MantineProvider>,
  );
  expect(
    screen
      .getByText("Closing does not reduce risk")
      .closest<HTMLElement>(".mantine-Alert-title")?.style.color,
  ).toBe("var(--mantine-color-text)");
});
