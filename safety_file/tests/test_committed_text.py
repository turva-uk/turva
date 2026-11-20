"""Reading a committed source: the Git object, bounded, never the working tree."""

from __future__ import annotations

import os

import pytest

from safety_file import Author, SafetyFileRepository, UnreadableSourceError, git


def commit(repo: SafetyFileRepository, author: Author, message: str = "test: fixture") -> str:
    git.run(["add", "--all"], cwd=repo.root)
    git.run(["commit", "--quiet", "-m", message], cwd=repo.root, author=author)
    return repo.head_sha


def test_reads_the_committed_version_not_an_uncommitted_edit(repo):
    head = repo.head_sha
    committed = repo.committed_text(head, "docs/index.md", max_bytes=100_000)
    (repo.root / "docs" / "index.md").write_text("# Uncommitted rewrite\n", encoding="utf-8")
    assert repo.committed_text(head, "docs/index.md", max_bytes=100_000) == committed
    assert "Uncommitted rewrite" not in committed


def test_missing_and_directory_entries_are_refused(repo):
    head = repo.head_sha
    with pytest.raises(UnreadableSourceError) as missing:
        repo.committed_text(head, "docs/absent.md", max_bytes=1000)
    assert missing.value.reason == "missing"
    with pytest.raises(UnreadableSourceError) as directory:
        repo.committed_text(head, "docs/hazards", max_bytes=1000)
    assert directory.value.reason == "not-a-file"


def test_pathspec_magic_and_globs_are_literal(repo):
    head = repo.head_sha
    for pattern in ("docs/*.md", ":(glob)docs/**", "docs/index.m?"):
        with pytest.raises(UnreadableSourceError) as refused:
            repo.committed_text(head, pattern, max_bytes=100_000)
        assert refused.value.reason == "missing"


def test_a_committed_symlink_is_not_followed(repo, author, tmp_path):
    outside = tmp_path / "outside-secret.txt"
    outside.write_text("not evidence", encoding="utf-8")
    target = repo.root / "docs" / "clinical-safety-case-report.md"
    target.unlink()
    os.symlink(outside, target)
    head = commit(repo, author)
    with pytest.raises(UnreadableSourceError) as refused:
        repo.committed_text(head, "docs/clinical-safety-case-report.md", max_bytes=100_000)
    assert refused.value.reason == "not-a-file"


def test_oversized_and_undecodable_sources_are_refused_whole(repo, author):
    (repo.root / "docs" / "index.md").write_text("x" * 2000, encoding="utf-8")
    (repo.root / "docs" / "clinical-risk-management-plan.md").write_bytes(b"# Plan \xff\xfe\n")
    head = commit(repo, author)
    with pytest.raises(UnreadableSourceError) as large:
        repo.committed_text(head, "docs/index.md", max_bytes=1000)
    assert large.value.reason == "too-large"
    with pytest.raises(UnreadableSourceError) as binary:
        repo.committed_text(head, "docs/clinical-risk-management-plan.md", max_bytes=1000)
    assert binary.value.reason == "not-text"


def test_reads_an_earlier_revision_exactly(repo, author):
    first = repo.head_sha
    original = repo.committed_text(first, "docs/index.md", max_bytes=100_000)
    (repo.root / "docs" / "index.md").write_text("# Revised\n", encoding="utf-8")
    second = commit(repo, author)
    assert repo.committed_text(second, "docs/index.md", max_bytes=100_000) == "# Revised\n"
    assert repo.committed_text(first, "docs/index.md", max_bytes=100_000) == original


def test_nul_containing_bytes_are_not_presented_as_readable_text(repo, author):
    (repo.root / "docs/index.md").write_bytes(b"Approved\0Not approved\n")
    head = commit(repo, author)
    with pytest.raises(UnreadableSourceError) as refused:
        repo.committed_text(head, "docs/index.md", max_bytes=1000)
    assert refused.value.reason == "not-text"


@pytest.mark.parametrize("limit", [0, -1, True, 1.5, "1000"])
def test_invalid_limits_stop_before_reading_a_git_object(repo, monkeypatch, limit):
    def unexpected(*args, **kwargs):
        pytest.fail("Invalid limits must not start a Git read")

    monkeypatch.setattr(git, "tree_entry", unexpected)
    with pytest.raises(ValueError, match="positive integer"):
        repo.committed_text(repo.head_sha, "docs/index.md", max_bytes=limit)
