"""Checks that every pre-commit hook is given every file it should check.

Usage: s/floors/reach [--hook-files FILE]

A hook whose `files`, `exclude` or `types` stop matching a folder still
passes, having checked nothing there, and can go on passing that way for
months. So each rule below names, from the tracked
files themselves, what a hook must receive, and this fails when a file is
missing. A rule that matches no file at all fails too, because a rule
pointed at a renamed folder would otherwise pass forever.

What each hook receives is asked of pre-commit itself, through its own
matching code, `pre_commit.commands.run.Classifier`. That is not a published
interface, so a pre-commit upgrade can change it. This then fails loudly
rather than passing. `--hook-files` reads the answer from a JSON file of
hook id to file list instead, which is how the bats tests run it.

Safe to run twice: it changes nothing.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

# git counts a file with a NUL byte in its first 8000 as binary.
BINARY_SNIFF_BYTES = 8000

SHELL_SHEBANG = re.compile(rb"^#!.*\b(ba|da)?sh\b|^#!.*\bbats\b")


@dataclass(frozen=True)
class Rule:
    """The files one hook must receive, picked from the tracked files."""

    hook_id: str
    covers: str
    wanted: Callable[[str], bool]


def is_text(path: str) -> bool:
    with open(path, "rb") as file:
        return b"\0" not in file.read(BINARY_SNIFF_BYTES)


def has_shell_shebang(path: str) -> bool:
    with open(path, "rb") as file:
        return bool(SHELL_SHEBANG.match(file.readline()))


def matches(pattern: str, unless: str | None = None) -> Callable[[str], bool]:
    """A file whose path matches `pattern`, and not `unless` when given."""

    def wanted(path: str) -> bool:
        if unless is not None and re.search(unless, path):
            return False

        return re.search(pattern, path) is not None

    return wanted


def text_file(unless: str | None = None) -> Callable[[str], bool]:
    def wanted(path: str) -> bool:
        if unless is not None and re.search(unless, path):
            return False

        return is_text(path)

    return wanted


def shell_script(path: str) -> bool:
    return path.endswith((".sh", ".bash", ".bats")) or has_shell_shebang(path)


# Each exception below matches an `exclude:` in .pre-commit-config.yaml and
# says why, so a new one has to be argued for here as well as there.
RULES = [
    Rule("trailing-whitespace", "every text file but SVG and .cjs", text_file(r"\.(svg|cjs)$")),
    Rule("end-of-file-fixer", "every text file but SVG and .cjs", text_file(r"\.(svg|cjs)$")),
    Rule("check-merge-conflict", "every text file", text_file()),
    Rule("check-added-large-files", "every file", lambda path: True),
    Rule("check-dev-details", "every text file", text_file()),
    Rule("check-yaml", "every YAML file", matches(r"\.ya?ml$")),
    # tsconfig files are JSON with comments, which check-json refuses.
    Rule(
        "check-json",
        "every JSON file but tsconfig",
        matches(r"\.json$", r"^frontend/tsconfig.*\.json$"),
    ),
    Rule("check-toml", "every TOML file", matches(r"\.toml$")),
    Rule(
        "zizmor",
        "every workflow and dependabot.yml",
        matches(r"^\.github/(workflows/.*\.ya?ml|dependabot\.ya?ml)$"),
    ),
    Rule("mypy", "every Python file in safety_file/", matches(r"^safety_file/.*\.pyi?$")),
    # pytest is built from assert, which bandit reports as B101.
    Rule(
        "bandit",
        "every non-test Python file in app/, safety_file/ and demo/",
        matches(r"^(app|safety_file|demo)/.*\.py$", r"(^|/)(tests/|conftest\.py$)"),
    ),
    Rule("ruff-check", "every Python file", matches(r"\.pyi?$")),
    Rule("ruff-format", "every Python file", matches(r"\.pyi?$")),
    Rule("shellcheck", "every shell script and bats test", shell_script),
    Rule("cspell", "every Markdown file", matches(r"\.(md|markdown)$")),
    Rule("markdownlint", "every Markdown file", matches(r"\.(md|markdown)$")),
    Rule(
        "prettier",
        "every Markdown, JSON, YAML and CSS file",
        matches(r"\.(md|markdown|json|ya?ml|css)$"),
    ),
]


def tracked_files() -> list[str]:
    listing = subprocess.run(["git", "ls-files", "-z"], capture_output=True, check=True)

    return [path for path in listing.stdout.decode().split("\0") if path and Path(path).is_file()]


def files_from_pre_commit(files: list[str]) -> dict[str, set[str]]:
    """Ask pre-commit which of `files` each hook would receive."""
    from pre_commit.clientlib import load_config
    from pre_commit.commands.run import Classifier
    from pre_commit.repository import all_hooks
    from pre_commit.store import Store

    config = load_config(".pre-commit-config.yaml")
    classifier = Classifier.from_config(files, config["files"], config["exclude"])
    received: dict[str, set[str]] = {}

    for hook in all_hooks(config, Store()):
        received.setdefault(hook.id, set()).update(classifier.filenames_for_hook(hook))

    return received


def files_from_json(path: str) -> dict[str, set[str]]:
    with open(path) as file:
        listing: dict[str, list[str]] = json.load(file)

    return {hook_id: set(paths) for hook_id, paths in listing.items()}


def problems(rules: list[Rule], files: list[str], received: dict[str, set[str]]) -> list[str]:
    found: list[str] = []

    for rule in rules:
        wanted = {path for path in files if rule.wanted(path)}

        if not wanted:
            found.append(
                f"{rule.hook_id}: no tracked file is {rule.covers}, so the rule itself points at nothing"
            )
            continue

        if rule.hook_id not in received:
            found.append(f"{rule.hook_id}: no such hook in .pre-commit-config.yaml")
            continue

        for path in sorted(wanted - received[rule.hook_id]):
            found.append(
                f"{rule.hook_id}: is not given {path}, although it should check {rule.covers}"
            )

    return found


def main(arguments: list[str]) -> int:
    files = tracked_files()

    if arguments[:1] == ["--hook-files"] and len(arguments) == 2:
        received = files_from_json(arguments[1])
    elif not arguments:
        received = files_from_pre_commit(files)
    else:
        print("Usage: s/floors/reach [--hook-files FILE]", file=sys.stderr)
        return 1

    found = problems(RULES, files, received)

    for problem in found:
        print(problem, file=sys.stderr)

    if found:
        print("A hook that is not given a file passes without checking it.", file=sys.stderr)
        return 1

    print(
        f"Every hook is given what it should check: {len(RULES)} rules over {len(files)} tracked files"
    )

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
