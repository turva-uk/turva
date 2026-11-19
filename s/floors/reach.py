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
import os
import re
import shlex
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_INVENTORY_BYTES = 4 * 1024 * 1024

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
        return bool(SHELL_SHEBANG.match(file.readline(512)))


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
    # These are trigger candidates only: the native staged scanner receives
    # no filenames. Its execution coverage is separate canary/scan evidence.
    Rule("gitleaks", "every file as a staged-scan trigger", lambda path: True),
    Rule("check-dev-details", "every text file", text_file()),
    Rule("check-yaml", "every YAML file", matches(r"\.ya?ml$")),
    # tsconfig files are JSON with comments, which check-json refuses.
    Rule(
        "check-json",
        "every JSON file but tsconfig",
        matches(r"\.json$", r"^frontend/tsconfig.*\.json$"),
    ),
    Rule("check-toml", "every TOML file", matches(r"\.toml$")),
    Rule("terraform-fmt", "every Terraform source file", matches(r"\.tf$")),
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
    environment = os.environ.copy()
    for key in ("GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE"):
        environment.pop(key, None)
    listing = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, env=environment, capture_output=True, check=True
    )
    if not listing.stdout or not listing.stdout.endswith(b"\0"):
        raise ValueError("tracked-file inventory is empty or incomplete")
    files = [os.fsdecode(path) for path in listing.stdout.split(b"\0") if path]
    if len(set(files)) != len(files):
        raise ValueError("duplicate tracked-file identity")
    for path in files:
        if not Path(path).resolve().is_relative_to(ROOT) or not Path(path).is_file():
            raise ValueError("a tracked file is missing or outside this checkout")
    return files


def files_from_pre_commit(files: list[str]):
    """Ask pre-commit which of `files` each hook would receive."""
    from pre_commit.clientlib import load_config
    from pre_commit.commands.run import Classifier
    from pre_commit.repository import all_hooks
    from pre_commit.store import Store

    config = load_config(".pre-commit-config.yaml")
    classifier = Classifier.from_config(files, config["files"], config["exclude"])
    received: dict[str, set[str]] = {}
    metadata = {}

    for hook in all_hooks(config, Store()):
        if hook.id in received:
            raise ValueError("duplicate configured hook identity")
        received[hook.id] = set(classifier.filenames_for_hook(hook))
        metadata[hook.id] = {
            "entry": hook.entry,
            "args": list(hook.args),
            "pass_filenames": hook.pass_filenames,
        }

    return received, metadata


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate inventory key")
        result[key] = value
    return result


def bounded_content(path):
    with open(path, "rb") as file:
        content = file.read(MAX_INVENTORY_BYTES + 1)
    if len(content) > MAX_INVENTORY_BYTES:
        raise ValueError("inventory exceeds its bound")
    return content


def files_from_json(path: str):
    content = bounded_content(path)
    listing = json.loads(content, object_pairs_hook=unique_keys)
    if not isinstance(listing, dict):
        raise ValueError("inventory must be a mapping")
    metadata = listing.pop("_metadata", {})
    if not isinstance(metadata, dict):
        raise ValueError("invalid hook metadata")
    for hook_id, paths in listing.items():
        if (
            not isinstance(hook_id, str)
            or not isinstance(paths, list)
            or any(not isinstance(path, str) for path in paths)
            or len(set(paths)) != len(paths)
        ):
            raise ValueError("inventory needs unique string file lists")
    return {hook_id: set(paths) for hook_id, paths in listing.items()}, metadata


def special_policies(received, metadata) -> list[str]:
    found = [
        f"{hook_id}: no explicit reach policy"
        for hook_id in sorted(set(received) - {rule.hook_id for rule in RULES})
    ]
    native = metadata.get("gitleaks")
    expected = ["gitleaks", "git", "--pre-commit", "--redact", "--staged", "--verbose"]
    if (
        not isinstance(native, dict)
        or native.get("pass_filenames") is not False
        or not isinstance(native.get("entry"), str)
        or shlex.split(native["entry"]) != expected
        or native.get("args") != []
    ):
        found.append("gitleaks: native filename-free staged-scan policy is missing or changed")
    return found


def frontend_policies() -> list[str]:
    # The frontend is a separate npm/CI surface, not root-hook TypeScript
    # coverage. Actual referenced-project behaviour has Node tooling regressions.
    import yaml

    package = json.loads(
        bounded_content(ROOT / "frontend/package.json"), object_pairs_hook=unique_keys
    )
    scripts = package["scripts"]
    expected = {
        "typecheck": "tsc -b",
        "lint": "eslint .",
        "test:tooling": "node --test tests/*.test.mjs",
        "test:ci": "npm run test:tooling && vitest run --project=unit",
        "build": "tsc -b && vite build",
        "build-storybook": "storybook build --quiet",
    }
    found = [
        f"frontend: {key} differs from the reviewed separate-surface command"
        for key, value in expected.items()
        if scripts.get(key) != value
    ]
    formatting = scripts.get("format", "")
    if not all(
        value in formatting
        for value in ("prettier --check", "src/**/*.{ts,tsx,css}", "tests/**/*.mjs")
    ):
        found.append("frontend: source and tooling formatting coverage is missing")
    try:
        workflow = yaml.safe_load(bounded_content(ROOT / ".github/workflows/ci.yml"))
    except yaml.YAMLError as error:
        raise ValueError("workflow configuration could not be read") from error
    job = workflow["jobs"]["frontend"]
    commands = {step.get("run", "").strip() for step in job["steps"]}
    for script in ("typecheck", "lint", "format", "test:ci", "build", "build-storybook"):
        if f"npm run {script}" not in commands:
            found.append(f"frontend: CI no longer calls {script}")
    if job["defaults"]["run"]["working-directory"] != "frontend":
        found.append("frontend: CI working directory changed")
    if not list((ROOT / "frontend/tests").glob("*.test.mjs")):
        found.append(
            "frontend: referenced-project and staged-draft tooling regressions are missing"
        )
    return found


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
    os.chdir(ROOT)
    files = tracked_files()

    if arguments[:1] == ["--hook-files"] and len(arguments) == 2:
        received, metadata = files_from_json(arguments[1])
    elif not arguments:
        received, metadata = files_from_pre_commit(files)
    else:
        print("Usage: s/floors/reach [--hook-files FILE]", file=sys.stderr)
        return 1

    found = (
        problems(RULES, files, received)
        + special_policies(received, metadata)
        + frontend_policies()
    )
    if any(not paths <= set(files) for paths in received.values()):
        found.append("Hook inventory includes paths outside the tracked scope")

    for problem in found:
        print(problem, file=sys.stderr)

    if found:
        print("A hook that is not given a file passes without checking it.", file=sys.stderr)
        return 1

    print(
        f"Every hook is given what it should check: {len(RULES)} policies over {len(files)} tracked files; native staged-scan triggers and separate frontend commands checked. This is routing/configuration evidence, not proof of scanner execution."
    )

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except (
        OSError,
        ValueError,
        TypeError,
        KeyError,
        AttributeError,
        RuntimeError,
        subprocess.SubprocessError,
    ) as error:
        print(
            f"Could not validate complete hook reach ({type(error).__name__}); no coverage is claimed.",
            file=sys.stderr,
        )
        sys.exit(1)
