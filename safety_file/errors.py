"""Exceptions raised by the safety file layer.

All of them derive from `SafetyFileError`, so a caller can catch the whole
category at a boundary without catching unrelated failures.
"""

from __future__ import annotations


class SafetyFileError(Exception):
    """Base class for every error raised by this package."""


class InvalidRiskScore(SafetyFileError):
    """A severity or likelihood value is not an integer in 1-5."""


class ValidationError(SafetyFileError):
    """A safety artefact violates a rule in specifications/safety-file-layout.md."""


class FrontmatterError(SafetyFileError):
    """A Markdown file's YAML frontmatter is missing or malformed."""


class GitError(SafetyFileError):
    """A Git command failed."""

    def __init__(self, command: list[str], returncode: int, stderr: str) -> None:
        self.command = command
        self.returncode = returncode
        self.stderr = stderr
        super().__init__(
            f"git {' '.join(command)} failed with exit code {returncode}: {stderr.strip()}"
        )


class SchemaVersionError(SafetyFileError):
    """The safety file's schema version is not one this code understands."""


class NotASafetyFileError(SafetyFileError):
    """The path is not a Turva safety file repository."""
