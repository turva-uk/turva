/**
 * OfficerList Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_POSTS } from "@/test/safetyFile";
import OfficerList from "./OfficerList";

describe("OfficerList", () => {
  it("names the holder and marks the registration not verified", () => {
    renderWithMantine(<OfficerList posts={SAMPLE_POSTS} />);
    expect(screen.getByText("Dr Anita Patel")).toBeInTheDocument();
    expect(screen.getByText("GMC 7654321, not verified")).toBeInTheDocument();
  });

  it("says a post is vacant", () => {
    renderWithMantine(<OfficerList posts={SAMPLE_POSTS} />);
    expect(screen.getByText("Vacant")).toBeInTheDocument();
  });

  it("draws no edit icon unless asked", () => {
    renderWithMantine(<OfficerList posts={SAMPLE_POSTS} />);
    expect(screen.queryByLabelText(/^Appoint/)).not.toBeInTheDocument();
  });

  it("reports the post to appoint to", async () => {
    const onEdit = vi.fn();
    renderWithMantine(<OfficerList posts={SAMPLE_POSTS} onEdit={onEdit} />);
    await userEvent.click(screen.getByLabelText("Appoint Top Management"));
    expect(onEdit).toHaveBeenCalledWith(SAMPLE_POSTS[1]);
  });
});
