"""Read-only checks for this checkout's text files, without printing matched values."""

import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_FILE_BYTES = 16 * 1024 * 1024
MAX_LIST_BYTES = 1024 * 1024
OCTET = r"(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])"
HOST_OCTET = r"(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]?)"
PRIVATE_PREFIX = (
    rf"(10\.{OCTET}\.{OCTET}|172\.(1[6-9]|2[0-9]|3[01])\.{OCTET}"
    rf"|192\.168\.{OCTET}|100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.{OCTET})"
)
PATTERNS = [
    (
        "private address",
        re.compile(rf"(^|[^0-9.]){PRIVATE_PREFIX}\.{HOST_OCTET}([^0-9./]|\.([^0-9]|$)|$)"),
    ),
    (
        "MAC address",
        re.compile(r"(^|[^0-9a-f:-])([0-9a-f]{2}[:-]){5}[0-9a-f]{2}([^0-9a-f:-]|$)", re.I),
    ),
]
FIXTURE_NAMES = ["test_*.py", "*_test.py", "*.test.ts", "*.test.tsx", "*.bats"]


class ScanFailure(Exception):
    """A failure to inspect the requested scope, not a clean result."""


def tracked_files() -> list[str]:
    environment = os.environ.copy()
    for key in ("GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE"):
        environment.pop(key, None)
    result = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, env=environment, capture_output=True, check=False
    )
    if result.returncode or (result.stdout and not result.stdout.endswith(b"\0")):
        raise ScanFailure("Could not list tracked files; no clean result is claimed.")
    return [os.fsdecode(name) for name in result.stdout.split(b"\0") if name]


def literals(explicit: Path | None) -> list[str]:
    path = explicit
    if path is None and not os.environ.get("CI"):
        candidate = ROOT / ".private/dev-details-denylist"
        if candidate.exists() or candidate.is_symlink():
            path = candidate
    if path is None:
        return []
    path = ROOT / path
    try:
        with path.open("rb") as stream:
            content = stream.read(MAX_LIST_BYTES + 1)
        if len(content) > MAX_LIST_BYTES or b"\0" in content:
            raise ValueError("invalid list")
        text = content.decode("utf-8")
    except (OSError, ValueError) as error:
        # Do not expose private paths, values or operating-system error text.
        raise ScanFailure(
            f"Optional denylist could not be read ({type(error).__name__})."
        ) from None
    return [
        line.strip().casefold()
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]


def inspect(name: str, personal: list[str]) -> list[tuple[str, int, str]]:
    path = ROOT / name
    try:
        relative = path.resolve().relative_to(ROOT)
    except (OSError, ValueError, RuntimeError) as error:
        raise ScanFailure(
            f"Input file is outside this checkout or cannot be resolved ({type(error).__name__}); nothing outside it was inspected."
        ) from None
    label = json.dumps(relative.as_posix(), ensure_ascii=True)[1:-1]
    try:
        if not path.is_file():
            raise OSError("not a regular file")
        with path.open("rb") as stream:
            content = stream.read(MAX_FILE_BYTES + 1)
        if b"\0" in content:
            return []  # The hook's scope is text, not binary attachments.
        if len(content) > MAX_FILE_BYTES:
            raise ValueError("oversized text file")
        text = content.decode("utf-8")
    except (OSError, ValueError) as error:
        raise ScanFailure(f"{label}: could not inspect text ({type(error).__name__}).") from None
    fixture = any(fnmatch.fnmatchcase(path.name, pattern) for pattern in FIXTURE_NAMES)
    findings = []
    for line_number, line in enumerate(text.splitlines(), 1):
        # Synthetic pattern fixtures retain the original explicit filename
        # exception. Personal literals are never exempt merely by filename.
        if not fixture:
            findings.extend(
                (label, line_number, rule) for rule, pattern in PATTERNS if pattern.search(line)
            )
        if any(value in line.casefold() for value in personal):
            findings.append((label, line_number, "a supplied personal literal"))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="inspect every tracked text file")
    parser.add_argument(
        "--denylist", type=Path, help="read an explicitly supplied private literal list"
    )
    parser.add_argument("files", nargs="*")
    args = parser.parse_args()
    if args.all and args.files:
        parser.error("--all cannot be combined with explicit files")
    try:
        personal = literals(args.denylist)
        files = tracked_files() if args.all else args.files
        findings = sorted({finding for name in files for finding in inspect(name, personal)})
    except (ScanFailure, OSError) as error:
        message = (
            str(error)
            if isinstance(error, ScanFailure)
            else "Could not run the tracked-file query."
        )
        print(message, file=sys.stderr)
        return 2
    for label, line_number, rule in findings:
        print(f"{label}:{line_number}: dev detail ({rule})")
    if findings:
        print(
            "Private development details must not be published in this repository.", file=sys.stderr
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
