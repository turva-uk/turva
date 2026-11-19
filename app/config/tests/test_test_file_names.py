"""Every file that holds tests has a name pytest collects.

pytest collects only files named `test_*.py`, as `python_files` in
`pyproject.toml` sets. A test written into a file with any other name never
runs, and nothing says so: the suite passes with fewer tests. This reads the
syntax tree of every Python file in `app/`, `safety_file/` and `demo/`, so a
file whose name merely starts with `test_` is judged by what it holds.
"""

import ast
import fnmatch
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FOLDERS = ("app", "safety_file", "demo")


def collected_patterns() -> list[str]:
    """The file names pytest collects, read from pyproject.toml on the host.

    The container mounts only the code, not pyproject.toml, so there the
    pattern falls back to pytest's own default, which Turva's matches.
    """
    pyproject = ROOT / "pyproject.toml"

    if not pyproject.is_file():
        return ["test_*.py"]

    settings = tomllib.loads(pyproject.read_text())

    return list(settings["tool"]["pytest"]["ini_options"]["python_files"])


def defines_tests(source: str) -> bool:
    """Whether a module defines a test function, or a Test class holding one."""
    module = ast.parse(source)

    for node in module.body:
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and node.name.startswith(
            "test"
        ):
            return True

        if isinstance(node, ast.ClassDef) and node.name.startswith("Test"):
            for item in node.body:
                if isinstance(
                    item, ast.FunctionDef | ast.AsyncFunctionDef
                ) and item.name.startswith("test"):
                    return True

    return False


def uncollected_test_files(root: Path, patterns: list[str]) -> list[str]:
    found: list[str] = []

    for folder in FOLDERS:
        for path in sorted((root / folder).rglob("*.py")):
            collected = any(fnmatch.fnmatch(path.name, pattern) for pattern in patterns)
            if not collected and defines_tests(path.read_text()):
                found.append(str(path.relative_to(root)))

    return found


def test_every_file_holding_tests_has_a_name_pytest_collects() -> None:
    patterns = collected_patterns()

    uncollected = uncollected_test_files(ROOT, patterns)

    assert uncollected == [], (
        f"pytest never collects these, so their tests never run: {uncollected}"
    )


def test_a_misnamed_test_file_is_found(tmp_path: Path) -> None:
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "checks_test_names.py").write_text("def test_runs():\n    assert True\n")
    (tmp_path / "app" / "test_named_right.py").write_text("def test_runs():\n    assert True\n")

    uncollected = uncollected_test_files(tmp_path, ["test_*.py"])

    assert uncollected == ["app/checks_test_names.py"]


def test_a_file_without_tests_is_not_flagged(tmp_path: Path) -> None:
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "helpers.py").write_text("def check_names():\n    return False\n")

    uncollected = uncollected_test_files(tmp_path, ["test_*.py"])

    assert uncollected == []
