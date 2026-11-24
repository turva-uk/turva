/**
 * FieldsetCard Component Tests
 *
 * The card groups its controls under its title for a screen reader, adds
 * the description line when given, and wears BaseCard's surface rather
 * than Mantine's grey fieldset box.
 */

import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";

import { CheckboxField } from "@/components/form";
import { renderWithMantine } from "@/test/test-utils";
import FieldsetCard from "./FieldsetCard";

function renderCard(description?: string) {
  return renderWithMantine(
    <FieldsetCard legend="Dr Anita Patel" description={description}>
      <CheckboxField label="Organisation administrator" />
    </FieldsetCard>,
  );
}

describe("FieldsetCard", () => {
  it("names the group with its title, so its controls are read as the person's", () => {
    renderCard();

    const group = screen.getByRole("group", { name: "Dr Anita Patel" });

    expect(
      within(group).getByRole("checkbox", { name: "Organisation administrator" }),
    ).toBeInTheDocument();
  });

  it("shows the description and reads it out as the group's description", () => {
    renderCard("a.patel@riverbank.example.nhs.uk");

    expect(screen.getByText("a.patel@riverbank.example.nhs.uk")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Dr Anita Patel" })).toHaveAccessibleDescription(
      "a.patel@riverbank.example.nhs.uk",
    );
  });

  it("has no description when none is given", () => {
    renderCard();

    expect(screen.getByRole("group", { name: "Dr Anita Patel" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("is a BaseCard, with the fieldset itself drawing no box", () => {
    renderCard();

    const card = screen.getByTestId("fieldset-card");
    const group = within(card).getByRole("group", { name: "Dr Anita Patel" });

    expect(card.getAttribute("style") ?? "").toContain(
      "background-color: var(--card-bg, var(--mantine-color-body))",
    );
    expect(group).toHaveAttribute("data-variant", "unstyled");
  });
});
