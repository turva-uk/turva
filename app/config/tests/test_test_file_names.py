"""Every file that holds tests has a name pytest collects.

Read pytest's active file/function/class settings, including any overrides,
rather than guessing a default when configuration is missing. This AST policy
catches ordinary top-level pytest definitions, including async methods. It is
not a substitute for collection counts or a proof about dynamically made tests.
"""

import ast
import fnmatch
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
FOLDERS = ("app", "safety_file", "demo")


def matches_name(name: str, patterns: list[str]) -> bool:
    """Pytest's function/class options accept prefixes as well as globs."""
    return any(
        name.startswith(pattern) or fnmatch.fnmatchcase(name, pattern) for pattern in patterns
    )


def defines_tests(source: str, functions: list[str], classes: list[str]) -> bool:
    """Whether a module defines an ordinary configured pytest test."""
    module = ast.parse(source)

    for node in module.body:
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and matches_name(
            node.name, functions
        ):
            return True

        if isinstance(node, ast.ClassDef) and matches_name(node.name, classes):
            for item in node.body:
                if isinstance(item, ast.FunctionDef | ast.AsyncFunctionDef) and matches_name(
                    item.name, functions
                ):
                    return True

    return False


def uncollected_test_files(
    root: Path,
    patterns: list[str],
    functions: list[str] | None = None,
    classes: list[str] | None = None,
) -> list[str]:
    found: list[str] = []

    for folder in FOLDERS:
        for path in sorted((root / folder).rglob("*.py")):
            collected = any(fnmatch.fnmatch(path.name, pattern) for pattern in patterns)
            if not collected and defines_tests(
                path.read_text(),
                ["test"] if functions is None else functions,
                ["Test"] if classes is None else classes,
            ):
                found.append(str(path.relative_to(root)))

    return found


def test_every_file_holding_tests_has_a_name_pytest_collects(pytestconfig: pytest.Config) -> None:
    uncollected = uncollected_test_files(
        ROOT,
        pytestconfig.getini("python_files"),
        pytestconfig.getini("python_functions"),
        pytestconfig.getini("python_classes"),
    )

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


@pytest.mark.parametrize(
    "source",
    [
        "async def check_async(): pass",
        "class ExampleCases:\n    async def check_method(self): pass",
    ],
)
def test_active_function_and_class_patterns_are_honoured(tmp_path: Path, source: str) -> None:
    (tmp_path / "app").mkdir()
    (tmp_path / "app/misnamed.py").write_text(source)
    assert uncollected_test_files(tmp_path, ["test_*.py"], ["check_*"], ["*Cases"]) == [
        "app/misnamed.py"
    ]
    assert uncollected_test_files(tmp_path, ["misnamed.py"], ["check_*"], ["*Cases"]) == []


def test_non_matching_definitions_do_not_override_active_collection_policy(tmp_path: Path) -> None:
    (tmp_path / "app").mkdir()
    (tmp_path / "app/helpers.py").write_text("def test_not_a_configured_test(): pass\n")
    assert uncollected_test_files(tmp_path, ["test_*.py"], ["check_*"], ["Example"]) == []
