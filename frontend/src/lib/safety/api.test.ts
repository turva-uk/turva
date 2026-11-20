import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import type { Hazard } from "@/api/types";

import {
  addHazard,
  addMitigation,
  createFile,
  downloadPdf,
  documentPath,
  getFile,
  getHazard,
  getMitigation,
  hazardOptions,
  isConflict,
  isNotFound,
  listFiles,
  mitigationOptions,
  previewAssessment,
  updateHazard,
  updateMitigation,
} from "./api";
import { hazardInputFrom } from "./hazardInput";
import type { MitigationInput, RiskScore } from "./types";

/**
 * Each call's method, path and body, against a mocked `fetch`.
 *
 * The client's own guarantees, CSRF and errors, are tested in
 * `@/api/client.test.ts`. These check that the safety calls use them,
 * send `expected_head` on every write, and never send a risk level.
 */

const HEAD = "a".repeat(40);

interface Sent {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

let fetchMock: ReturnType<typeof vi.fn>;

function respond(status = 200, jsonBody: unknown = {}, contentType = "application/json") {
  fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers({ "Content-Type": contentType }),
    json: async () => jsonBody,
    blob: async () => new Blob(["%PDF"], { type: contentType }),
  } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
}

/** The one request the call made. */
function sent(): Sent {
  expect(fetchMock).toHaveBeenCalledTimes(1);

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const body = typeof init.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;

  return {
    url,
    method: init.method ?? "GET",
    headers: init.headers as Record<string, string>,
    body,
  };
}

/** A hazard as the API serves it, levels and all. */
const HAZARD: Hazard = {
  id: "HAZ-001",
  title: "Wrong patient record opened from the ward list",
  status: "open",
  owner: "cso@example.nhs.uk",
  created: "2026-11-01",
  updated: "2026-11-02",
  initial: { severity: 4, likelihood: 3, risk_level: 4, risk_label: "Mandatory elimination" },
  residual: {
    severity: 4,
    likelihood: 1,
    risk_level: 2,
    risk_label: "Acceptable if cost of reduction exceeds benefit",
  },
  cause: "The ward list sorts by bed.",
  effect: "A note is written in the wrong record.",
  harm: "Treatment given on another patient's history.",
  justification: "",
  mitigations: ["MIT-001"],
  requires_elimination: true,
  body: "## Notes\n\nFictional test only.\n",
};

const MITIGATION: MitigationInput = {
  title: "Show the patient banner on every screen",
  status: "proposed",
  owner: "lead@example.nhs.uk",
  control_type: "technical",
  hazards: ["HAZ-001"],
  evidence: "",
  body: "",
};

beforeEach(() => {
  Object.defineProperty(document, "cookie", {
    value: "csrftoken=a-test-token",
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("files", () => {
  it("lists them with a GET", async () => {
    respond(200, []);
    await listFiles();

    expect(sent()).toMatchObject({ url: "/api/v1/safety-files/", method: "GET" });
  });

  it("creates one with a POST of what the form gave", async () => {
    respond(201, {});
    const input = {
      name: "Ward list",
      standard: "DCB0160" as const,
      organisation: "Riverbank Health Federation",
      intended_use: "Finding a patient on a ward.",
    };
    await createFile(input);

    expect(sent()).toMatchObject({ url: "/api/v1/safety-files/", method: "POST", body: input });
  });

  it("reads one by its slug", async () => {
    respond();
    await getFile("ward-list");

    expect(sent()).toMatchObject({ url: "/api/v1/safety-files/ward-list/", method: "GET" });
  });

  it("rejects URL path syntax instead of treating it as a file identity", async () => {
    respond();
    await expect(getFile("../auth")).rejects.toThrow(/identifier/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads the PDF at the version read", async () => {
    respond(200, {}, "application/pdf");
    const pdf = await downloadPdf("ward-list", HEAD);

    expect(sent()).toMatchObject({
      url: `/api/v1/safety-files/ward-list/pdf/?expected_head=${HEAD}`,
      method: "GET",
    });
    expect(pdf).toBeInstanceOf(Blob);
  });
});

describe("hazards", () => {
  it("adds one with a POST carrying expected_head and the CSRF header", async () => {
    respond(201, {});
    const input = hazardInputFrom(HAZARD);
    await addHazard("ward-list", input, HEAD);

    const request = sent();
    expect(request).toMatchObject({
      url: "/api/v1/safety-files/ward-list/hazards/",
      method: "POST",
      body: { ...input, expected_head: HEAD },
    });
    expect(request.headers["X-CSRFToken"]).toBe("a-test-token");
  });

  it("reads one", async () => {
    respond();
    await getHazard("ward-list", "HAZ-001");

    expect(sent()).toMatchObject({
      url: "/api/v1/safety-files/ward-list/hazards/HAZ-001/",
      method: "GET",
    });
  });

  it("updates one with a PATCH carrying expected_head and the CSRF header", async () => {
    respond();
    await updateHazard(
      "ward-list",
      "HAZ-001",
      { status: "closed", justification: "Removed." },
      HEAD,
    );

    const request = sent();
    expect(request).toMatchObject({
      url: "/api/v1/safety-files/ward-list/hazards/HAZ-001/",
      method: "PATCH",
      body: { status: "closed", justification: "Removed.", expected_head: HEAD },
    });
    expect(request.headers["X-CSRFToken"]).toBe("a-test-token");
  });
});

describe("mitigations", () => {
  it("adds one with a POST carrying expected_head and the CSRF header", async () => {
    respond(201, {});
    await addMitigation("ward-list", MITIGATION, HEAD);

    const request = sent();
    expect(request).toMatchObject({
      url: "/api/v1/safety-files/ward-list/mitigations/",
      method: "POST",
      body: { ...MITIGATION, expected_head: HEAD },
    });
    expect(request.headers["X-CSRFToken"]).toBe("a-test-token");
  });

  it("reads one", async () => {
    respond();
    await getMitigation("ward-list", "MIT-001");

    expect(sent()).toMatchObject({
      url: "/api/v1/safety-files/ward-list/mitigations/MIT-001/",
      method: "GET",
    });
  });

  it("updates one with a PATCH carrying expected_head", async () => {
    respond();
    await updateMitigation("ward-list", "MIT-001", { status: "implemented" }, HEAD);

    expect(sent()).toMatchObject({
      url: "/api/v1/safety-files/ward-list/mitigations/MIT-001/",
      method: "PATCH",
      body: { status: "implemented", expected_head: HEAD },
    });
  });
});

describe("options and the risk preview", () => {
  it("reads the hazard options", async () => {
    respond();
    await hazardOptions();

    expect(sent()).toMatchObject({ url: "/api/v1/hazard-options/", method: "GET" });
  });

  it("reads the mitigation options", async () => {
    respond();
    await mitigationOptions();

    expect(sent()).toMatchObject({ url: "/api/v1/mitigation-options/", method: "GET" });
  });

  it("asks the server for the level, sending only severity and likelihood", async () => {
    const preview = {
      severity: 4,
      likelihood: 3,
      risk_level: 4,
      risk_label: "Mandatory elimination",
    };
    respond(200, preview);

    await expect(previewAssessment(4, 3)).resolves.toEqual(preview);
    expect(sent()).toMatchObject({
      url: "/api/v1/assessment-preview/?severity=4&likelihood=3",
      method: "GET",
      body: undefined,
    });
  });
});

describe("failures", () => {
  it("recognises a 409 as a conflict", async () => {
    respond(409, { detail: "The file has changed since you opened it." });
    const failure = await updateHazard("ward-list", "HAZ-001", {}, HEAD).catch(
      (e: unknown) => e,
    );

    expect(isConflict(failure)).toBe(true);
    expect(isNotFound(failure)).toBe(false);
  });

  it("recognises a 404 as not found", async () => {
    respond(404, { detail: "Not found." });
    const failure = await getHazard("ward-list", "HAZ-999").catch((e: unknown) => e);

    expect(isNotFound(failure)).toBe(true);
    expect(isConflict(failure)).toBe(false);
  });

  it("does not count anything but an ApiError", () => {
    expect(isConflict(new Error("409"))).toBe(false);
    expect(isNotFound({ status: 404 })).toBe(false);
    expect(isConflict(new ApiError(409, "Conflict"))).toBe(true);
  });
});

describe("risk level", () => {
  it("is never in a request body, even for a hazard read with one", async () => {
    const input = hazardInputFrom(HAZARD);
    const writes = [
      () => addHazard("ward-list", input, HEAD),
      () => updateHazard("ward-list", "HAZ-001", input, HEAD),
      () => updateHazard("ward-list", "HAZ-001", { initial: input.initial }, HEAD),
      () => addMitigation("ward-list", MITIGATION, HEAD),
      () => updateMitigation("ward-list", "MIT-001", MITIGATION, HEAD),
    ];

    for (const write of writes) {
      respond();
      await write();

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.body).toEqual(expect.any(String));
      expect(String(init.body)).not.toMatch(/risk_level|risk_label/);
    }
  });
});

describe("route identity is not URL navigation", () => {
  it("uses the same document route for requests and navigation", () => {
    expect(documentPath("ward-list_1", "risk-management-plan")).toBe(
      "/safety-files/ward-list_1/documents/risk-management-plan/",
    );
  });

  it.each([
    "",
    ".",
    "..",
    "ward/list",
    "ward\\list",
    "ward?other=true",
    "overview#section",
    "overview%2fextra",
  ])("rejects URL syntax in both document route identities: %s", (value) => {
    expect(() => documentPath(value, "overview")).toThrow(/identifier/i);
    expect(() => documentPath("ward-list", value)).toThrow(/identifier/i);
  });

  it.each(["ward-list-1", "ward_list", "WARD_LIST_1"])(
    "preserves a valid ASCII identifier exactly: %s",
    async (slug) => {
      respond();
      await getFile(slug);
      const url = sent().url;
      expect(url).toBe(`/api/v1/safety-files/${slug}/`);
      expect(new URL(url, "https://example.test").pathname).toBe(url);
    },
  );

  it("returns local validation failures through the same promise contract as HTTP failures", async () => {
    respond();
    const result = getFile("..");
    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toThrow(/identifier/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "",
    ".",
    "..",
    "../auth",
    "ward/list",
    "ward\\list",
    "ward?other=true",
    "ward-list\n",
  ])("rejects a non-segment file identifier before any request: %s", async (slug) => {
    const calls: (() => Promise<unknown>)[] = [
      () => getFile(slug),
      () => downloadPdf(slug, HEAD),
      () => getHazard(slug, "HAZ-001"),
      () => addHazard(slug, hazardInputFrom(HAZARD), HEAD),
      () => updateHazard(slug, "HAZ-001", {}, HEAD),
      () => getMitigation(slug, "MIT-001"),
      () => addMitigation(slug, MITIGATION, HEAD),
      () => updateMitigation(slug, "MIT-001", {}, HEAD),
    ];
    for (const call of calls) {
      respond();
      await expect(Promise.resolve().then(call)).rejects.toThrow(/identifier/i);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it.each(["", ".", "..", "../HAZ-001", "HAZ-001/extra", "MIT-001\\extra", "HAZ-001\n"])(
    "rejects a non-segment record identifier before reads and writes: %s",
    async (id) => {
      const calls: (() => Promise<unknown>)[] = [
        () => getHazard("ward-list", id),
        () => updateHazard("ward-list", id, {}, HEAD),
        () => getMitigation("ward-list", id),
        () => updateMitigation("ward-list", id, {}, HEAD),
      ];
      for (const call of calls) {
        respond();
        await expect(Promise.resolve().then(call)).rejects.toThrow(/identifier/i);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    },
  );
});

describe("preview scores are actual integer choices", () => {
  it.each([0, 6, 1.5, NaN, Infinity, "3", "2&likelihood=5", null])(
    "refuses an invalid score instead of constructing a different preview query: %s",
    async (value) => {
      const score = value as unknown as RiskScore;
      for (const call of [
        () => previewAssessment(score, 3),
        () => previewAssessment(3, score),
      ]) {
        respond();
        await expect(Promise.resolve().then(call)).rejects.toThrow(/score/i);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    },
  );
});
