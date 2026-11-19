"""Require positive, redacted evidence for the synthetic gitleaks canary."""

import json
import sys
from pathlib import Path


def main(report: Path, expected_file: Path) -> None:
    with report.open("rb") as stream:
        content = stream.read(1_048_577)
    if len(content) > 1_048_576:
        raise ValueError("oversized report")
    findings = json.loads(content)
    if not isinstance(findings, list) or len(findings) != 1:
        raise ValueError("expected one canary finding")
    item = findings[0]
    if (
        not isinstance(item, dict)
        or item.get("RuleID") != "github-pat"
        or not isinstance(item.get("File"), str)
        or Path(item["File"]).resolve() != expected_file.resolve()
        or type(item.get("StartLine")) is not int
        or item["StartLine"] != 1
        or type(item.get("EndLine")) is not int
        or item["EndLine"] != 1
        or item.get("Secret") != "REDACTED"
        or item.get("Match") != "REDACTED"
    ):
        raise ValueError("canary evidence mismatch")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            raise ValueError("expected report and canary paths")
        main(Path(sys.argv[1]), Path(sys.argv[2]))
    except (OSError, ValueError, TypeError) as error:
        # Never print report contents: even a broken scanner must not leak them.
        print(
            f"Canary report did not prove the expected redacted github-pat finding ({type(error).__name__}).",
            file=sys.stderr,
        )
        sys.exit(1)
