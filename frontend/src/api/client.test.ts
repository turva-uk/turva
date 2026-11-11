import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api, request } from "./client";

/**
 * The two properties this client exists to guarantee.
 *
 * Both were absent from the frontend removed in October, because it talked to
 * a FastAPI backend that did not enforce CSRF - so neither is hypothetical.
 */

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? "OK",
    json: async () => response.jsonBody ?? {},
  } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    value,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  setCookie("csrftoken=a-test-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CSRF", () => {
  it("sends the token on unsafe methods", async () => {
    const fetchMock = mockFetch({});
    await api.post("/auth/login/", { email: "a@b.example.nhs.uk" });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["X-CSRFToken"]).toBe("a-test-token");
  });

  it("does not send it on GET, which does not need one", async () => {
    const fetchMock = mockFetch({});
    await api.get("/safety-files/");

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["X-CSRFToken"]).toBeUndefined();
  });

  it("reads the cookie at call time, not at module load", async () => {
    // Django rotates the token on login, so a value captured once would be
    // stale from the first sign-in onwards - and the symptom is a 403 on the
    // next save, nowhere near the cause.
    const fetchMock = mockFetch({});
    setCookie("csrftoken=rotated-after-login");
    await api.post("/safety-files/", { name: "x" });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["X-CSRFToken"]).toBe("rotated-after-login");
  });

  it("always sends credentials, or the API sees every request as anonymous", async () => {
    const fetchMock = mockFetch({});
    await api.get("/auth/session/");

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.credentials).toBe("include");
  });
});

describe("failures are never silent", () => {
  it("flattens nested assessment errors without losing their field paths", async () => {
    mockFetch({
      ok: false,
      status: 400,
      jsonBody: { initial: { severity: ["Select an integer score from 1 to 5."] } },
    });
    const error = (await api
      .post("/safety-files/demo/hazards/", {})
      .catch((e: unknown) => e)) as ApiError;
    expect(error.fieldErrors["initial.severity"]).toEqual([
      "Select an integer score from 1 to 5.",
    ]);
    expect(error.message).toBe("Select an integer score from 1 to 5.");
  });
  it("throws on a 4xx rather than returning a body", async () => {
    // `fetch` does not reject on an error status, so without this a failed
    // save is indistinguishable from a successful one - which in a safety tool
    // means a hazard the user believes is recorded and is not. See TH-001.
    mockFetch({ ok: false, status: 400, jsonBody: { name: ["Give the system a name."] } });

    await expect(api.post("/safety-files/", {})).rejects.toBeInstanceOf(ApiError);
  });

  it("surfaces DRF field errors for the form to show", async () => {
    mockFetch({ ok: false, status: 400, jsonBody: { name: ["Give the system a name."] } });

    const error = await api.post("/safety-files/", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors.name).toEqual(["Give the system a name."]);
    expect((error as ApiError).message).toBe("Give the system a name.");
  });

  it("uses the detail message when DRF sends one", async () => {
    mockFetch({ ok: false, status: 403, jsonBody: { detail: "Confirm your email address." } });

    const error = (await api.get("/safety-files/").catch((e: unknown) => e)) as ApiError;
    expect(error.message).toBe("Confirm your email address.");
    expect(error.isForbidden).toBe(true);
  });

  it("reports a network failure rather than hanging or returning null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = (await api.get("/safety-files/").catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toContain("Could not reach Turva");
  });

  it("survives a non-JSON error body", async () => {
    // An HTML error page from a proxy, for instance. The status is still
    // worth reporting.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      } as unknown as Response),
    );

    const error = (await api.get("/safety-files/").catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.message).toContain("502");
  });
});

describe("requests", () => {
  it("does not try to parse a 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        json: async () => {
          throw new Error("a 204 has no body to parse");
        },
      } as unknown as Response),
    );

    await expect(request("/safety-files/x/", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
