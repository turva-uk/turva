export interface A11ySettings {
  disable?: boolean;
  test?: "off" | "todo" | "error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** No result is not a clean scan. Validate the current portable story's reports. */
export function assertA11yReports(
  title: string,
  reports: unknown,
  settings: A11ySettings = {},
): void {
  if (settings.disable === true || settings.test === "off") return;
  const fail = (reason: string): never => {
    throw new Error(`${title}: ${reason}`);
  };
  if (!Array.isArray(reports)) fail("no accessibility reports were produced");
  const a11y = (reports as unknown[]).filter(
    (report) => isRecord(report) && report.type === "a11y",
  );
  if (a11y.length !== 1) fail("expected one accessibility report for this story");
  const report = a11y[0];
  if (!isRecord(report) || report.version !== 1 || !isRecord(report.result)) {
    fail("invalid accessibility report");
  }
  const { result, status } = report as Record<string, unknown> & {
    result: Record<string, unknown>;
  };
  if ("error" in result) fail("axe failed to execute; this is not a passing scan");
  if (
    !Array.isArray(result.violations) ||
    !result.violations.every((v) => isRecord(v) && typeof v.id === "string")
  ) {
    fail("axe did not return a valid violations list");
  }
  const violations = result.violations as { id: string }[];
  if (violations.length === 0) {
    if (status !== "passed") fail("accessibility scan did not pass");
    return;
  }
  const message = `${title}: accessibility violations: ${violations.map((v) => v.id).join(", ")}`;
  if (settings.test === "todo" && status === "warning") {
    console.warn(message);
    return;
  }
  fail(message);
}
