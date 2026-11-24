import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine, renderWithRouter } from "@/test/test-utils";
import {
  BLOCKING_HAZARD,
  MITIGATED_HAZARD,
  SAMPLE_HAZARD_OPTIONS,
  SAMPLE_MITIGATIONS,
  assessment,
  samplePreview,
} from "@/test/safetyFile";
import RiskScoreBadge from "./RiskScoreBadge";
import HazardDetail from "./HazardDetail";
import HazardForm from "./HazardForm";
import HazardTable from "./HazardTable";
import SafetyCaseTable from "./SafetyCaseTable";
import { hazardInputFrom } from "@/lib/safety";

describe("safety presentation integrity (TH-001/TH-008)", () => {
  it.each(["hazards", "files"])(
    "distinguishes unavailable %s from an empty successful list",
    async (kind) => {
      renderWithRouter(
        kind === "hazards" ? (
          <HazardTable hazards={[]} error="Recorded evidence could not be read." />
        ) : (
          <SafetyCaseTable cases={[]} error="Recorded evidence could not be read." />
        ),
      );
      expect(screen.getByText("Recorded evidence could not be read.")).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "Error loading data: Recorded evidence could not be read.",
        ),
      );
      expect(
        screen.queryByText(/No hazards in the log|No safety files yet/),
      ).not.toBeInTheDocument();
    },
  );
  it.each([0, 6, 2.5, NaN])(
    "does not present an unsupported risk level as a normal assessment: %s",
    (risk_level) => {
      renderWithMantine(<RiskScoreBadge assessment={{ ...assessment(4, 1), risk_level }} />);
      expect(screen.getByRole("alert")).toHaveTextContent(/unavailable|unsupported/i);
      expect(screen.queryByRole("img", { name: /^Risk level/ })).not.toBeInTheDocument();
    },
  );

  it("exposes a compact risk label through keyboard focus", async () => {
    renderWithMantine(<RiskScoreBadge assessment={assessment(4, 1)} compact />);
    await userEvent.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Acceptable if cost of reduction exceeds benefit",
    );
  });

  it("does not present valid-looking derived labels beside unsupported scores", () => {
    renderWithMantine(
      <RiskScoreBadge assessment={{ ...assessment(4, 1), severity: 6 }} compact />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("unsupported recorded values");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each(["closed", "transferred", "under review"])(
    "does not let a %s status hide a recorded high residual assessment",
    (status) => {
      renderWithMantine(
        <HazardDetail hazard={{ ...BLOCKING_HAZARD, status }} mitigations={[]} />,
      );
      expect(screen.getByText(/residual risk requires elimination/i)).toBeInTheDocument();
      expect(screen.getByText(/does not.*reduce.*assessment/i)).toBeInTheDocument();
    },
  );

  it("distinguishes an unavailable linked mitigation from no recorded mitigation", () => {
    renderWithMantine(<HazardDetail hazard={MITIGATED_HAZARD} mitigations={[]} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/MIT-001/);
    expect(screen.queryByText("No mitigation is recorded against it.")).not.toBeInTheDocument();
  });

  it("keeps mitigation ownership and recorded evidence with the named control", () => {
    renderWithMantine(
      <HazardDetail hazard={MITIGATED_HAZARD} mitigations={SAMPLE_MITIGATIONS} />,
    );
    const control = screen.getByRole("region", { name: /MIT-001/ });
    expect(
      within(control).getByText(SAMPLE_MITIGATIONS[0]!.owner, { exact: false }),
    ).toBeInTheDocument();
    expect(within(control).getByText(SAMPLE_MITIGATIONS[0]!.evidence)).toBeInTheDocument();
  });

  it("keeps the hazard identity, recorded responsibility and missing fields visible", () => {
    renderWithMantine(
      <HazardDetail
        hazard={{ ...MITIGATED_HAZARD, cause: "" }}
        mitigations={SAMPLE_MITIGATIONS}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: `${MITIGATED_HAZARD.id}: ${MITIGATED_HAZARD.title}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(MITIGATED_HAZARD.owner))).toBeInTheDocument();
    expect(screen.getByText("Not recorded.")).toBeInTheDocument();
  });

  it("does not permit cancellation while the caller reports a pending save", async () => {
    const onCancel = vi.fn();
    renderWithMantine(
      <HazardForm
        initial={hazardInputFrom(MITIGATED_HAZARD)}
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={samplePreview}
        onSubmit={vi.fn()}
        onCancel={onCancel}
        saving
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("does not display a preview returned for different scores", async () => {
    renderWithMantine(
      <HazardForm
        initial={hazardInputFrom(MITIGATED_HAZARD)}
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={() => Promise.resolve(assessment(1, 1))}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(await screen.findAllByText(/could not work out the risk level/i)).toHaveLength(2);
    expect(screen.queryByRole("img", { name: /^Risk level 1/ })).not.toBeInTheDocument();
  });

  it("starts a new hazard without assuming clinical scores", () => {
    const preview = vi.fn(samplePreview);
    renderWithMantine(
      <HazardForm
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={preview}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(preview).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByRole("combobox", { name: /^Severity/ })
        .every((input) => (input as HTMLInputElement).value === ""),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("combobox", { name: /^Likelihood/ })
        .every((input) => (input as HTMLInputElement).value === ""),
    ).toBe(true);
    expect(screen.queryByRole("img", { name: /^Risk level/ })).not.toBeInTheDocument();
  });

  // A long interaction: four selects and five fields. Under the full parallel
  // suite it runs past the five-second default, so it is given longer.
  it("requires all four clinical choices before submitting a new hazard", async () => {
    const onSubmit = vi.fn();
    const preview = vi.fn(samplePreview);
    renderWithMantine(
      <HazardForm
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={preview}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Hazard title" }),
      "Fictional draft",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Responsible email address" }),
      "cso@example.test",
    );
    // Cause, effect and harm are required as well, as the page has always
    // required them, so they are filled; the four scores are what is tested.
    for (const name of ["Cause", "Effect on the care pathway", "Potential harm"]) {
      await userEvent.type(screen.getByRole("textbox", { name }), "Fictional text");
    }
    await userEvent.click(screen.getByRole("button", { name: "Save hazard" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalled();
    for (const name of ["Initial assessment", "Residual assessment"]) {
      const group = within(screen.getByRole("group", { name }));
      await userEvent.click(group.getByRole("combobox", { name: /^Severity/ }));
      await userEvent.click(await screen.findByRole("option", { name: "4 - Major" }));
      await userEvent.click(group.getByRole("combobox", { name: /^Likelihood/ }));
      await userEvent.click(await screen.findByRole("option", { name: "1 - Very low" }));
    }
    await userEvent.click(screen.getByRole("button", { name: "Save hazard" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      initial: { severity: 4, likelihood: 1 },
      residual: { severity: 4, likelihood: 1 },
    });
  }, 20_000);

  it("retains unsupported Markdown source through an unrelated title edit", async () => {
    const body = "Before <!-- >= --> 5 mg.\n\n![Reviewed diagram](evidence/diagram.png)";
    const onSubmit = vi.fn();
    renderWithMantine(
      <HazardForm
        initial={{ ...MITIGATED_HAZARD, body }}
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={samplePreview}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Additional narrative (Markdown)" }),
    ).toHaveValue(body);
    await userEvent.type(screen.getByRole("textbox", { name: "Hazard title" }), " edited");
    await userEvent.click(screen.getByRole("button", { name: "Save hazard" }));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ body });
  });

  it("projects an API hazard to write fields before submitting", async () => {
    const onSubmit = vi.fn();
    renderWithMantine(
      <HazardForm
        initial={MITIGATED_HAZARD}
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={samplePreview}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save hazard" }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(hazardInputFrom(MITIGATED_HAZARD));
    expect(JSON.stringify(onSubmit.mock.calls[0])).not.toMatch(
      /risk_level|created|mitigations|requires_elimination/,
    );
  });

  it("shows an unsupported recorded status read-only without replacing it", () => {
    const onSubmit = vi.fn();
    renderWithMantine(
      <HazardForm
        initial={{ ...MITIGATED_HAZARD, status: "under review" }}
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={samplePreview}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/read-only/i);
    expect(screen.getByLabelText("Recorded status")).toHaveValue("under review");
    expect(screen.getByLabelText("Additional narrative (Markdown)")).toHaveAttribute(
      "readonly",
    );
    expect(screen.queryByRole("button", { name: "Save hazard" })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(["initial", "residual"] as const)(
    "retains unsupported %s scores read-only without previewing another assessment",
    (which) => {
      const preview = vi.fn(samplePreview);
      renderWithMantine(
        <HazardForm
          initial={{
            ...MITIGATED_HAZARD,
            [which]: { ...MITIGATED_HAZARD[which], severity: 6 },
          }}
          options={SAMPLE_HAZARD_OPTIONS}
          previewAssessment={preview}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent("Read-only hazard");
      expect(screen.getByLabelText(`Recorded ${which} assessment`)).toHaveValue(
        `Severity 6, likelihood ${MITIGATED_HAZARD[which].likelihood}`,
      );
      expect(preview).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Save hazard" })).not.toBeInTheDocument();
    },
  );

  it("surfaces a synchronous preview failure without losing the draft", async () => {
    renderWithMantine(
      <HazardForm
        initial={MITIGATED_HAZARD}
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={() => {
          throw new Error("unavailable");
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(await screen.findAllByText(/could not work out the risk level/)).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: "Hazard title" })).toHaveValue(
      MITIGATED_HAZARD.title,
    );
  });

  it("does not replace an opened draft with incoming record props", async () => {
    const props = {
      options: SAMPLE_HAZARD_OPTIONS,
      previewAssessment: samplePreview,
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    };
    const { rerender } = renderWithMantine(
      <HazardForm {...props} initial={MITIGATED_HAZARD} />,
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Hazard title" }),
      " retained edit",
    );
    rerender(
      <HazardForm
        {...props}
        initial={{ ...MITIGATED_HAZARD, title: "Incoming version", body: "Incoming notes" }}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Hazard title" })).toHaveValue(
      `${MITIGATED_HAZARD.title} retained edit`,
    );
    expect(
      screen.getByRole("textbox", { name: "Additional narrative (Markdown)" }),
    ).not.toHaveValue("Incoming notes");
    rerender(
      <HazardForm
        {...props}
        key="deliberately-opened-version"
        initial={{ ...MITIGATED_HAZARD, title: "Incoming version", body: "Incoming notes" }}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Hazard title" })).toHaveValue(
      "Incoming version",
    );
    expect(
      screen.getByRole("textbox", { name: "Additional narrative (Markdown)" }),
    ).toHaveValue("Incoming notes");
  });

  it("retains the draft and revokes editing when permission becomes read-only", async () => {
    const onSubmit = vi.fn();
    const props = {
      initial: hazardInputFrom(MITIGATED_HAZARD),
      options: SAMPLE_HAZARD_OPTIONS,
      previewAssessment: samplePreview,
      onSubmit,
      onCancel: vi.fn(),
    };
    const { rerender } = renderWithMantine(<HazardForm {...props} />);
    await screen.findAllByRole("img", { name: /^Risk level/ });
    await userEvent.type(
      screen.getByRole("textbox", { name: "Hazard title" }),
      " retained draft",
    );
    rerender(<HazardForm {...props} readOnly />);
    expect(screen.getByRole("textbox", { name: "Hazard title" })).toHaveValue(
      `${MITIGATED_HAZARD.title} retained draft`,
    );
    expect(screen.getByRole("textbox", { name: "Hazard title" })).toHaveAttribute("readonly");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Hazard title" }),
      " unwanted change",
    );
    expect(screen.getByRole("textbox", { name: "Hazard title" })).toHaveValue(
      `${MITIGATED_HAZARD.title} retained draft`,
    );
    expect(screen.getByLabelText("Additional narrative (Markdown)")).toHaveAttribute(
      "readonly",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save hazard" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("supports native keyboard submission of a valid existing draft", async () => {
    const onSubmit = vi.fn();
    renderWithMantine(
      <HazardForm
        initial={hazardInputFrom(MITIGATED_HAZARD)}
        options={SAMPLE_HAZARD_OPTIONS}
        previewAssessment={samplePreview}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await screen.findAllByRole("img", { name: /^Risk level/ });
    await userEvent.type(screen.getByRole("textbox", { name: "Hazard title" }), "{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
