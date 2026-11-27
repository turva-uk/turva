/**
 * RiskScoreBadge Component Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { assessment } from "@/test/safetyFile";
import RiskScoreBadge from "./RiskScoreBadge";

describe("RiskScoreBadge", () => {
  it("shows the derived level's number and word together", () => {
    renderWithMantine(<RiskScoreBadge assessment={assessment(4, 3)} />);
    expect(
      screen.getByRole("img", { name: /^Risk level 4, Mandatory elimination/ }),
    ).toHaveTextContent(/^4\s*Mandatory elimination$/);
  });

  it("puts the words beside the badge as text, so a long one wraps", () => {
    // A badge never wraps, and "Acceptable if cost of reduction exceeds
    // benefit" in one ran past the edge of a half-width card.
    renderWithMantine(<RiskScoreBadge assessment={assessment(4, 1)} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText("Acceptable if cost of reduction exceeds benefit"),
    ).toBeInTheDocument();
  });

  it("names the level and both scores for a screen reader", () => {
    renderWithMantine(<RiskScoreBadge assessment={assessment(4, 1)} />);
    expect(
      screen.getByLabelText(
        "Risk level 2, Acceptable if cost of reduction exceeds benefit: " +
          "severity 4, likelihood 1",
      ),
    ).toBeInTheDocument();
  });

  it("shows the level it is given, and never works one out", () => {
    // A level the matrix would never give for these scores: the badge
    // shows it as it came, since the server is the only matrix (TH-008).
    renderWithMantine(
      <RiskScoreBadge
        assessment={{ severity: 1, likelihood: 1, risk_level: 5, risk_label: "Unacceptable" }}
      />,
    );
    expect(
      screen.getByRole("img", { name: /^Risk level 5, Unacceptable/ }),
    ).toBeInTheDocument();
  });

  it("shows the severity and likelihood in front, with withScores", () => {
    renderWithMantine(<RiskScoreBadge assessment={assessment(4, 3)} withScores />);

    expect(
      screen.getByRole("img", { name: /^Risk level 4, Mandatory elimination/ }),
    ).toHaveTextContent(/^S4 L3\s*4\s*Mandatory elimination$/);
  });

  describe("compact, for a table", () => {
    it("shows the level's number alone", () => {
      renderWithMantine(<RiskScoreBadge assessment={assessment(4, 1)} compact />);

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.queryByText(/Acceptable if cost of reduction/)).not.toBeInTheDocument();
    });

    it("still names the level and both scores for a screen reader", () => {
      renderWithMantine(<RiskScoreBadge assessment={assessment(4, 1)} compact />);

      expect(
        screen.getByLabelText(
          "Risk level 2, Acceptable if cost of reduction exceeds benefit: " +
            "severity 4, likelihood 1",
        ),
      ).toBeInTheDocument();
    });

    it("shows the level's words on hover", async () => {
      const user = userEvent.setup();
      renderWithMantine(<RiskScoreBadge assessment={assessment(4, 3)} compact />);

      await user.hover(screen.getByText("4"));

      expect(await screen.findByText(/Mandatory elimination: severity 4/)).toBeInTheDocument();
    });
  });
});
