import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_EXTRAS, SAMPLE_EXTRAS_FOR_CSO, SAMPLE_HEAD } from "@/test/safetyFile";
import type { SafetyFileExtras } from "@/lib/safety";
import SignOffPanel, { type SignOffPanelProps } from "./SignOffPanel";

function renderPanel(file: SafetyFileExtras = SAMPLE_EXTRAS_FOR_CSO) {
  const onSign = vi.fn<SignOffPanelProps["onSign"]>();
  onSign.mockResolvedValue(undefined);
  renderWithMantine(<SignOffPanel file={file} head={SAMPLE_HEAD} onSign={onSign} />);

  return { onSign };
}

describe("SignOffPanel", () => {
  it("shows both sign-offs and who holds each post", () => {
    renderPanel();

    const approval = screen.getByTestId("sign-off-approved");
    const acceptance = screen.getByTestId("sign-off-accepted");
    expect(within(approval).getByText("Post holder: Dr Anita Patel")).toBeInTheDocument();
    expect(within(acceptance).getByText("Nobody holds this post yet.")).toBeInTheDocument();
  });

  it("approves with the code typed", async () => {
    const { onSign } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Approve the safety case" }));
    await userEvent.type(screen.getByLabelText("Authenticator code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(onSign).toHaveBeenCalledWith("approved", "123456", SAMPLE_HEAD));
  });

  it("offers nothing to somebody who may not sign", () => {
    renderPanel({ ...SAMPLE_EXTRAS, sign_offs: null });

    expect(
      screen.queryByRole("button", { name: "Approve the safety case" }),
    ).not.toBeInTheDocument();
  });

  it("explains the proposed two-factor requirement without claiming setup is implemented", () => {
    renderPanel({
      ...SAMPLE_EXTRAS_FOR_CSO,
      sign_offs: {
        can_approve: true,
        can_accept: false,
        two_factor_enabled: false,
        tags: [],
      },
    });

    expect(
      screen.getByText(/No sign-off or two-factor setup workflow is implemented/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve the safety case" }),
    ).not.toBeInTheDocument();
  });

  it("retains a supplied tag without claiming it establishes the file's history", () => {
    renderPanel({
      ...SAMPLE_EXTRAS_FOR_CSO,
      status: "draft",
      sign_offs: {
        can_approve: true,
        can_accept: false,
        two_factor_enabled: true,
        tags: ["approved/2026-11-07"],
      },
    });

    expect(
      within(screen.getByTestId("sign-off-approved")).getByText(
        "This proposal does not establish whether this person has signed the opened version.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("approved/2026-11-07", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/the file has changed since/)).not.toBeInTheDocument();
  });
});
