import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SafetyFileDetail } from "../api/types";
import { SAMPLE_FILE_DETAIL, SAMPLE_MITIGATIONS } from "../test/safetyFile";
import { renderWithRouter } from "../test/test-utils";
import { SafetyFileDetailPage } from "./SafetyFileDetailPage";

/** Show the page for a file, with the server answering `detail`. */
function show(detail: SafetyFileDetail) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(detail), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
  renderWithRouter(<SafetyFileDetailPage />, {
    routePath: "/safety-files/:slug",
    initialRoute: `/safety-files/${detail.safety_file.slug}`,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SafetyFileDetailPage", () => {
  it("shows the hazards, mitigations and audit trail, each named", async () => {
    show(SAMPLE_FILE_DETAIL);

    await screen.findByRole("heading", { name: SAMPLE_FILE_DETAIL.safety_file.name });
    expect(
      screen.getByRole("table", { name: "Hazards recorded in this safety file" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Mitigations and their linked hazards" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Change history" })).toBeInTheDocument();
    expect(
      screen.getByText(/Risk level is derived from severity and likelihood/),
    ).toBeVisible();
  });

  it("warns about an open hazard whose residual risk must be eliminated", async () => {
    show(SAMPLE_FILE_DETAIL);

    const alert = await screen.findByText("Residual risk requires elimination before go-live");

    expect(alert.closest("[role=alert]")).toHaveTextContent(
      "HAZ-002 has a derived residual risk level of 4 or 5 and is still open.",
    );
  });

  it("lists a file's validation problems", async () => {
    show({ ...SAMPLE_FILE_DETAIL, problems: ["HAZ-009 has no owner."] });

    expect(await screen.findByText("This safety file does not validate")).toBeInTheDocument();
    expect(screen.getByText("HAZ-009 has no owner.")).toBeInTheDocument();
  });

  it("says a missing repository needs a person, and shows nothing else of the file", async () => {
    show({
      ...SAMPLE_FILE_DETAIL,
      repository_missing: true,
      repository_path: "/srv/safety-files/bp-at-home",
    });

    expect(await screen.findByText("The repository is not on disk")).toBeInTheDocument();
    expect(screen.getByText("/srv/safety-files/bp-at-home")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("offers to record a hazard and a mitigation only to somebody who may edit", async () => {
    show({ ...SAMPLE_FILE_DETAIL, can_edit: false });

    await screen.findByRole("heading", { name: SAMPLE_FILE_DETAIL.safety_file.name });
    expect(screen.queryByRole("button", { name: "Record hazard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record mitigation" })).not.toBeInTheDocument();
  });

  it("shows the record buttons to somebody who may edit", async () => {
    show(SAMPLE_FILE_DETAIL);

    expect(await screen.findByRole("button", { name: "Record hazard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record mitigation" })).toBeInTheDocument();
  });
  it("puts the record mitigation button in the mitigations table's bar", async () => {
    show(SAMPLE_FILE_DETAIL);

    const record = await screen.findByRole("button", { name: "Record mitigation" });
    const bar = record.closest(".mantine-Group-root");

    expect(bar).toContainElement(screen.getByRole("button", { name: "Filter mitigations" }));
  });

  it("filters the mitigations by control type", async () => {
    const [first] = SAMPLE_MITIGATIONS;
    if (!first) throw new Error("No sample mitigation");
    const procedural = {
      ...first,
      id: "MIT-002",
      title: "Weekly review of unflagged readings",
      control_type: "procedural",
      status: "planned",
    };
    show({ ...SAMPLE_FILE_DETAIL, mitigations: [first, procedural] });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Filter mitigations" }));
    await user.click(screen.getByLabelText("Filter mitigations", { selector: "input" }));
    await user.click(await screen.findByRole("option", { name: "procedural" }));

    expect(screen.getByRole("link", { name: procedural.title })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: first.title })).not.toBeInTheDocument();
  });
});
