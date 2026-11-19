/**
 * SafetyStatusBadge Component Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import SafetyStatusBadge from "./SafetyStatusBadge";

describe("SafetyStatusBadge", () => {
  it.each([
    ["draft", "Draft"],
    ["approved", "Approved by the CSO"],
    ["accepted", "Accepted for go-live"],
  ] as const)("says what %s means", (status, label) => {
    renderWithMantine(<SafetyStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
