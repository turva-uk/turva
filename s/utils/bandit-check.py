"""Require a complete Bandit report for the hook's requested Turva source files.

This is an authorised static check of this checkout or synthetic fixtures, not
permission to scan another organisation's source. Reports stay in temporary
files; diagnostics omit source snippets and arbitrary scanner error text.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_REPORT_BYTES = 16 * 1024 * 1024


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate report key")
        result[key] = value
    return result


def source_path(name: str) -> Path:
    path = (ROOT / name).resolve()
    path.relative_to(ROOT)
    if not path.is_file():
        raise ValueError("requested source is unavailable")
    return path


def line_count(metrics: object) -> int:
    if not isinstance(metrics, dict) or type(metrics.get("loc")) is not int or metrics["loc"] < 0:
        raise ValueError("missing or invalid line count")
    return metrics["loc"]


def complete_report(report: object, expected: set[Path], status: int):
    if not isinstance(report, dict) or report.get("errors") != []:
        raise ValueError("scanner skipped an input or omitted its error report")
    metrics, findings = report.get("metrics"), report.get("results")
    if not isinstance(metrics, dict) or not isinstance(findings, list):
        raise ValueError("incomplete report")
    total = line_count(metrics.get("_totals"))
    covered = {}
    for name, values in metrics.items():
        if name == "_totals":
            continue
        path = source_path(name)
        if path in covered:
            raise ValueError("duplicate source identity")
        covered[path] = line_count(values)
    if set(covered) != expected or total != sum(covered.values()):
        raise ValueError("report does not cover exactly the requested files")
    diagnostics = []
    for finding in findings:
        if not isinstance(finding, dict) or not isinstance(finding.get("filename"), str):
            raise ValueError("invalid finding")
        path = source_path(finding["filename"])
        rule, line = finding.get("test_id"), finding.get("line_number")
        if (
            path not in expected
            or not isinstance(rule, str)
            or not re.fullmatch(r"B[0-9]{3}", rule)
            or type(line) is not int
            or line < 1
        ):
            raise ValueError("finding outside requested scope or without a rule/line")
        label = json.dumps(path.relative_to(ROOT).as_posix(), ensure_ascii=True)[1:-1]
        diagnostics.append((label, line, rule))
    if status not in (0, 1) or bool(findings) != (status == 1):
        raise ValueError("scanner exit status and report disagree")
    return total, diagnostics


def scan(files: list[str]):
    if not files:
        raise ValueError("no source files requested")
    expected = {source_path(name) for name in files}
    if len(expected) != len(files):
        raise ValueError("duplicate requested source identity")
    with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as errors:
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "bandit",
                "--quiet",
                "--skip",
                "B404",
                "--format",
                "json",
                "--",
                *files,
            ],
            cwd=ROOT,
            stdout=output,
            stderr=errors,
            check=False,
            timeout=120,
        )
        output.seek(0)
        content = output.read(MAX_REPORT_BYTES + 1)
    if len(content) > MAX_REPORT_BYTES:
        raise ValueError("report is oversized")
    return complete_report(
        json.loads(content, object_pairs_hook=unique_keys), expected, result.returncode
    )


def main() -> int:
    try:
        total, findings = scan(sys.argv[1:])
    except (OSError, ValueError, TypeError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(
            f"Bandit could not prove a complete scan ({type(error).__name__}); no clean result is claimed.",
            file=sys.stderr,
        )
        return 2
    print(f"Total lines of code: {total}")
    print("Files skipped (0):")
    for label, line, rule in findings:
        print(f"{label}:{line}: bandit {rule}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
