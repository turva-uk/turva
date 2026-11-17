/**
 * HazardForm Component Tests
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { blankHazard, hazardInputFrom, type Assessment, type HazardInput } from "@/lib/safety";
import { renderWithMantine } from "@/test/test-utils";
import {
  assessment,
  MITIGATED_HAZARD,
  SAMPLE_HAZARD_OPTIONS,
  samplePreview,
} from "@/test/safetyFile";

import HazardForm, { type PreviewAssessment } from "./HazardForm";

function renderForm({
  initial = hazardInputFrom(MITIGATED_HAZARD),
  preview = vi.fn<PreviewAssessment>(samplePreview),
  onSubmit = vi.fn<(hazard: HazardInput) => void>(),
  error = null as string | null,
} = {}) {
  renderWithMantine(
    <HazardForm
      initial={initial}
      options={SAMPLE_HAZARD_OPTIONS}
      previewAssessment={preview}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      error={error}
    />,
  );

  return { preview, onSubmit };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The initial assessment's likelihood select: the first of the two. */
function initialLikelihood(): HTMLElement {
  const [first] = screen.getAllByLabelText("Likelihood");
  if (!first) throw new Error("No likelihood select");

  return first;
}

describe("HazardForm", () => {
  describe("the level shown", () => {
    it("is the one the server gives each assessment", async () => {
      const { preview } = renderForm();

      expect(
        await screen.findByRole("img", { name: /^Risk level 4, Mandatory elimination/ }),
      ).toHaveTextContent(/^4\s*Mandatory elimination$/);
      expect(
        await screen.findByRole("img", {
          name: /^Risk level 2, Acceptable if cost of reduction exceeds benefit/,
        }),
      ).toBeInTheDocument();
      expect(preview).toHaveBeenCalledWith(4, 3, expect.any(AbortSignal));
      expect(preview).toHaveBeenCalledWith(4, 1, expect.any(AbortSignal));
    });

    it("is asked for again when a score changes", async () => {
      const user = userEvent.setup();
      const { preview } = renderForm();
      await screen.findByRole("img", { name: /^Risk level 4,/ });

      await user.click(initialLikelihood());
      await user.click(await screen.findByRole("option", { name: "1 - Very low" }));

      expect(preview).toHaveBeenLastCalledWith(4, 1, expect.any(AbortSignal));
      await waitFor(() =>
        expect(screen.getAllByRole("img", { name: /^Risk level 2,/ })).toHaveLength(2),
      );
    });

    it("says it is being worked out until the server answers, never showing one of its own", () => {
      renderForm({
        preview: vi.fn<PreviewAssessment>(() => new Promise<Assessment>(() => {})),
      });

      expect(screen.getByText("Working out the initial risk level")).toBeInTheDocument();
      expect(screen.getByText("Working out the residual risk level")).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /^Risk level/ })).not.toBeInTheDocument();
    });

    it("never shows a late answer against scores it was not for", async () => {
      const user = userEvent.setup();
      let answerTheFirst: (value: Assessment) => void = () => {};
      const preview = vi.fn<PreviewAssessment>((severity, likelihood) =>
        severity === 4 && likelihood === 3
          ? new Promise<Assessment>((resolve) => {
              answerTheFirst = resolve;
            })
          : samplePreview(severity, likelihood),
      );
      renderForm({
        initial: {
          ...blankHazard("cso@example.nhs.uk"),
          initial: { severity: 4, likelihood: 3 },
        },
        preview,
      });

      await user.click(initialLikelihood());
      await user.click(await screen.findByRole("option", { name: "1 - Very low" }));
      await screen.findAllByRole("img", { name: /^Risk level/ });

      answerTheFirst(assessment(4, 3));
      await Promise.resolve();

      expect(screen.queryByRole("img", { name: /^Risk level 4,/ })).not.toBeInTheDocument();
    });

    it("says so when the server cannot be asked", async () => {
      renderForm({
        preview: vi.fn<PreviewAssessment>(() => Promise.reject(new Error("offline"))),
      });

      expect(await screen.findAllByText(/could not work out the risk level/)).toHaveLength(2);
    });

    it("asks Turva's assessment-preview route when no stand-in is given", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => assessment(3, 3),
      } as unknown as Response);
      vi.stubGlobal("fetch", fetchMock);

      renderWithMantine(
        <HazardForm
          initial={blankHazard("cso@example.nhs.uk")}
          options={SAMPLE_HAZARD_OPTIONS}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/v1/assessment-preview/?severity=3&likelihood=3",
          expect.objectContaining({ method: "GET" }),
        ),
      );
    });
  });

  describe("what it sends", () => {
    it("holds severity and likelihood, and no risk level", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();
      await screen.findAllByRole("img", { name: /^Risk level/ });

      await user.click(screen.getByRole("button", { name: "Save hazard" }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const sent = onSubmit.mock.calls[0]![0];
      expect(sent.initial).toEqual({ severity: 4, likelihood: 3 });
      expect(sent.residual).toEqual({ severity: 4, likelihood: 1 });
      expect(JSON.stringify(sent)).not.toMatch(/risk_level|risk_label/);
    });

    it("does not send a hazard with no title or owner", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm({ initial: blankHazard() });

      await user.click(screen.getByRole("button", { name: "Save hazard" }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText("Give the hazard a title.")).toBeInTheDocument();
      expect(
        screen.getByText("Give the email address of the hazard's owner."),
      ).toBeInTheDocument();
    });

    it("shows the save's own error", () => {
      renderForm({ error: "Somebody else saved this file after you opened it." });

      expect(
        screen.getByText("Somebody else saved this file after you opened it."),
      ).toBeInTheDocument();
    });
  });
});
