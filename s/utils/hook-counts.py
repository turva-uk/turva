"""Validate native hook reports before emitting one complete count stream."""

import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 8 * 1024 * 1024
ANSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
HOOKS = (
    ("bandit", "bandit-lines"),
    ("mypy", "mypy-files"),
    ("cspell", "cspell-files"),
    ("zizmor", "zizmor-files"),
    ("check-dev-details", "dev-details-files"),
)


class ReportError(Exception):
    """A report is not complete evidence of a measured scope."""


def hook_report(pre_commit: str, hook: str) -> list[str]:
    environment = os.environ.copy()
    for key in ("GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE"):
        environment.pop(key, None)
    with tempfile.TemporaryFile() as stream:
        result = subprocess.run(
            [pre_commit, "run", hook, "--all-files", "--verbose", "--color=never"],
            cwd=ROOT,
            env=environment,
            stdout=stream,
            stderr=subprocess.STDOUT,
            check=False,
            timeout=300,
        )
        stream.seek(0)
        content = stream.read(MAX_BYTES + 1)
    if result.returncode:
        raise ReportError(
            f"The {hook} hook failed; inspect its normal hook output before trusting a count."
        )
    if len(content) > MAX_BYTES or b"\0" in content:
        raise ReportError(f"The {hook} report exceeded its supported bounds.")
    return [ANSI.sub("", line).strip() for line in content.decode("utf-8").splitlines()]


def numbers(lines: list[str], hook: str, prefix: str, pattern: str) -> list[int]:
    found = []
    for line in lines:
        if line.startswith(prefix):
            match = re.fullmatch(pattern, line)
            if match is None or len(match[1]) > 12:
                raise ReportError(f"The {hook} report contains an invalid or incomplete count.")
            found.append(int(match[1]))
    if not found:
        raise ReportError(f"The {hook} hook did not say how much it checked.")
    return found


def count(hook: str, lines: list[str]) -> int:
    if hook == "bandit":
        totals = numbers(lines, hook, "Total lines of code:", r"Total lines of code: ([0-9]+)")
        skipped = numbers(lines, hook, "Files skipped", r"Files skipped \(([0-9]+)\):")
        if len(totals) != len(skipped):
            raise ReportError("The bandit report is missing a per-batch skip or line count.")
        if sum(skipped):
            raise ReportError(
                f"Bandit could not read {sum(skipped)} files; no complete count is claimed."
            )
        return sum(totals)
    if hook == "mypy":
        totals = numbers(
            lines, hook, "Success:", r"Success: no issues found in ([0-9]+) source files?"
        )
        if len(totals) != 1:
            raise ReportError("The serial mypy report has duplicate or ambiguous summaries.")
        return totals[0]
    if hook == "cspell":
        return sum(
            numbers(
                lines,
                hook,
                "CSpell:",
                r"CSpell: Files checked: ([0-9]+), Issues found: 0 in 0 files\.",
            )
        )
    if hook == "check-dev-details":
        return sum(numbers(lines, hook, "Checked ", r"Checked ([0-9]+) files? for dev details"))
    completed = []
    for line in lines:
        match = re.fullmatch(r"INFO\s+audit:\s+zizmor:\s+(?:🌈\s+)?completed (.+\.ya?ml)", line)
        if match:
            completed.append(match[1])
        elif "completed " in line:
            raise ReportError("The zizmor report contains an unrecognised completion record.")
    if not completed:
        raise ReportError("The zizmor hook did not say how much it checked.")
    if len(set(completed)) != len(completed) or not any(
        line.startswith("No findings to report.") for line in lines
    ):
        raise ReportError("The zizmor report is duplicate or incomplete.")
    return len(completed)


def main() -> int:
    try:
        if len(sys.argv) != 2:
            raise ReportError("Usage: s/floors/hook-counts (no arguments)")
        measured = [(key, count(hook, hook_report(sys.argv[1], hook))) for hook, key in HOOKS]
    except (ReportError, OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(
            str(error)
            if isinstance(error, ReportError)
            else f"Could not measure the complete hook scope ({type(error).__name__}).",
            file=sys.stderr,
        )
        return 1
    for key, value in measured:
        print(f"{key} {value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
