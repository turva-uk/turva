"""Collect complete, bounded suite counts without running tests or installing tools."""

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUITES = ("safety-file", "django", "vitest", "bats")
MAX_BYTES = 16 * 1024 * 1024
SUMMARY = re.compile(
    r"([1-9][0-9]{0,11}) tests? collected(?:, [0-9]+ warnings?)? in [0-9]+(?:\.[0-9]+)?s"
)


class CollectionError(Exception):
    """A complete collection count could not be established."""


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise CollectionError("Duplicate collection-report key.")
        result[key] = value
    return result


def command(suite: str):
    python = ROOT / ".venv/bin/python"
    if suite == "safety-file":
        return ROOT, [
            str(python) if os.access(python, os.X_OK) else "python3",
            "-m",
            "pytest",
            "safety_file",
            "--collect-only",
            "-q",
            "--color=no",
        ]
    if suite == "django":
        return ROOT, [
            "docker",
            "compose",
            "exec",
            "-T",
            "web",
            "pytest",
            "app",
            "--collect-only",
            "-q",
            "--color=no",
        ]
    if suite == "bats":
        return ROOT, ["bats", "--count", "s/tests"]
    module = ROOT / "frontend/node_modules/vitest/vitest.mjs"
    if not module.is_file():
        raise CollectionError(
            "Vitest is not installed locally. Run ./s/frontend install explicitly; no packages were installed."
        )
    return ROOT / "frontend", [
        "node",
        "node_modules/vitest/vitest.mjs",
        "list",
        "--project=unit",
        "--json",
    ]


def report(suite: str) -> bytes:
    directory, arguments = command(suite)
    environment = os.environ.copy()
    for key in ("GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE"):
        environment.pop(key, None)
    with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as errors:
        result = subprocess.run(
            arguments,
            cwd=directory,
            env=environment,
            stdout=output,
            stderr=errors,
            check=False,
            timeout=180,
        )
        output.seek(0)
        content = output.read(MAX_BYTES + 1)
    if result.returncode or len(content) > MAX_BYTES or b"\0" in content:
        raise CollectionError(
            f"The {suite} suite did not produce a successful bounded collection report. Run its normal gate to inspect the failure."
        )
    return content


def pytest_count(content: bytes) -> int:
    lines = content.decode("utf-8").splitlines()
    summaries = [
        SUMMARY.fullmatch(line)
        for line in lines
        if "collected" in line and re.match(r"^[0-9]", line)
    ]
    if len(summaries) != 1 or summaries[0] is None:
        raise CollectionError("Expected exactly one unfiltered pytest collection summary.")
    return int(summaries[0][1])


def vitest_count(content: bytes) -> int:
    records = json.loads(content, object_pairs_hook=unique_keys)
    if not isinstance(records, list) or not records:
        raise CollectionError("Vitest collection must be a non-empty array.")
    identities = set()
    for record in records:
        if not isinstance(record, dict) or record.get("projectName") != "unit":
            raise CollectionError("Vitest collection includes an invalid or non-unit project.")
        name, filename, location = record.get("name"), record.get("file"), record.get("location")
        if (
            not isinstance(name, str)
            or not name.strip()
            or not isinstance(filename, str)
            or not isinstance(location, dict)
        ):
            raise CollectionError("Vitest collection is missing its test identity.")
        file = (ROOT / "frontend" / filename).resolve()
        line, column = location.get("line"), location.get("column")
        if (
            not file.is_relative_to(ROOT / "frontend/src")
            or not file.is_file()
            or not file.name.endswith((".test.ts", ".test.tsx"))
            or type(line) is not int
            or type(column) is not int
            or line < 1
            or column < 1
        ):
            raise CollectionError("Vitest collection has an invalid file or source location.")
        identity = (record["projectName"], file, name, line, column)
        if identity in identities:
            raise CollectionError("Duplicate Vitest test identity.")
        identities.add(identity)
    return len(identities)


def count(suite: str, content: bytes) -> int:
    if suite in ("safety-file", "django"):
        return pytest_count(content)
    if suite == "vitest":
        return vitest_count(content)
    text = content.decode("utf-8")
    if re.fullmatch(r"[1-9][0-9]{0,11}\n?", text) is None:
        raise CollectionError("Expected one positive Bats collection count.")
    return int(text)


def main() -> int:
    try:
        suites = sys.argv[1:]
        if not suites:
            raise CollectionError(
                "No suite given. Usage: s/floors/test-counts <safety-file|django|vitest|bats>..."
            )
        if len(set(suites)) != len(suites):
            raise CollectionError("Duplicate requested suite; nothing was collected.")
        unknown = set(suites) - set(SUITES)
        if unknown:
            raise CollectionError(f"Unknown suite '{sorted(unknown)[0]}'.")
        measured = [(suite, count(suite, report(suite))) for suite in suites]
    except (
        CollectionError,
        OSError,
        ValueError,
        RecursionError,
        subprocess.TimeoutExpired,
    ) as error:
        print(
            str(error)
            if isinstance(error, CollectionError)
            else f"Could not validate the complete suite scope ({type(error).__name__}); no count is claimed.",
            file=sys.stderr,
        )
        return 1
    for suite, value in measured:
        print(f"{suite}-tests {value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
