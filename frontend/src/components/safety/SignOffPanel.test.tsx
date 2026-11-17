import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_EXTRAS, SAMPLE_EXTRAS_FOR_CSO } from "@/test/safetyFile";
import type { SafetyFileExtras } from "@/lib/safety";
import SignOffPanel from "./SignOffPanel";

function renderPanel(file: SafetyFileExtras = SAMPLE_EXTRAS_FOR_CSO) {
  const onSign = vi.fn<(kind: "approved" | "accepted", code: string) => Promise<void>>();
  onSign.mockResolvedValue(undefined);
  renderWithMantine(<SignOffPanel file={file} onSign={onSign} />);

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

    await waitFor(() => expect(onSign).toHaveBeenCalledWith("approved", "123456"));
  });

  it("offers nothing to somebody who may not sign", () => {
    renderPanel({ ...SAMPLE_EXTRAS, sign_offs: null });

    expect(
      screen.queryByRole("button", { name: "Approve the safety case" }),
    ).not.toBeInTheDocument();
  });

  it("asks a signer with no two-factor to set it up", () => {
    renderPanel({
      ...SAMPLE_EXTRAS_FOR_CSO,
      sign_offs: {
        can_approve: true,
        can_accept: false,
        two_factor_enabled: false,
        tags: [],
      },
    });

    expect(screen.getByText(/Set up two-factor authentication/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve the safety case" }),
    ).not.toBeInTheDocument();
  });

  it("says a sign-off no longer holds once the file has changed", () => {
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
        "Last signed as approved/2026-11-07; the file has changed since.",
      ),
    ).toBeInTheDocument();
  });
});
