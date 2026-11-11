"""Local Git writes are serialised and stale/dirty saves fail closed (TH-004)."""

from __future__ import annotations

import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace

import pytest

from safety_file import SafetyFileRepository, git
from safety_file.errors import (
    DirtyRepositoryError,
    InvalidRiskScore,
    StaleVersionError,
    ValidationError,
)


def child(root, mode):
    code = """
import sys
from pathlib import Path
from safety_file import SafetyFileRepository
from safety_file.errors import RepositoryBusyError
repo = SafetyFileRepository(Path(sys.argv[1]))
context = repo.snapshot(timeout=0) if sys.argv[2] == 'read' else repo.edit(timeout=0)
try:
    with context:
        pass
except RepositoryBusyError:
    print('busy')
else:
    print('acquired')
"""
    return subprocess.check_output([sys.executable, "-c", code, str(root), mode], text=True).strip()


def test_an_edit_excludes_other_process_readers_and_writers(repo):
    with repo.edit():
        assert child(repo.root, "read") == "busy"
        assert child(repo.root, "write") == "busy"
    assert child(repo.root, "write") == "acquired"


def test_read_snapshots_share_the_lock_but_exclude_writes(repo):
    with repo.snapshot():
        assert child(repo.root, "read") == "acquired"
        assert child(repo.root, "write") == "busy"


def test_nested_saves_keep_the_outer_edit_lock(repo, hazard, author):
    with repo.edit(expected_head=repo.head_sha):
        repo.save_hazard(hazard, author)
        assert child(repo.root, "write") == "busy"
    assert repo.is_clean
    assert repo.hazard(hazard.id).title == hazard.title


def test_competing_saves_check_the_opened_version_inside_the_lock(repo, hazard, author):
    """TH-004: only one form opened at the same version may commit."""
    head = repo.head_sha
    ready = threading.Barrier(2)

    def save(title):
        repository = SafetyFileRepository(repo.root)
        ready.wait(timeout=5)
        try:
            with repository.edit(expected_head=head):
                repository.save_hazard(replace(hazard, title=title), author)
            return "saved"
        except StaleVersionError:
            return "stale"

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(save, ["First judgement", "Second judgement"]))
    assert sorted(outcomes) == ["saved", "stale"]
    assert len(repo.history()) == 2  # scaffold and the one accepted judgement
    assert repo.is_clean


def test_concurrent_allocations_and_generated_log_are_serialised(repo, hazard, author):
    ready = threading.Barrier(2)

    def save(title):
        repository = SafetyFileRepository(repo.root)
        ready.wait(timeout=5)
        with repository.edit():
            identifier = repository.next_hazard_id()
            repository.save_hazard(replace(hazard, id=identifier, title=title), author)
        return identifier

    with ThreadPoolExecutor(max_workers=2) as pool:
        identifiers = list(pool.map(save, ["First hazard", "Second hazard"]))
    assert sorted(identifiers) == ["HAZ-001", "HAZ-002"]
    log = (repo.root / "docs/hazards/index.md").read_text()
    assert "First hazard" in log and "Second hazard" in log
    assert repo.is_clean


def test_a_read_snapshot_cannot_be_upgraded_to_a_write(repo, hazard, author):
    before = repo.head_sha
    with repo.snapshot(), pytest.raises(RuntimeError, match="read-only"):
        repo.save_hazard(hazard, author)
    assert repo.head_sha == before


def test_stale_preconditions_do_not_change_files_or_history(repo, hazard, author):
    old = repo.head_sha
    repo.save_hazard(hazard, author)
    head = repo.head_sha
    with pytest.raises(StaleVersionError), repo.edit(expected_head=old):
        pytest.fail("A stale edit was allowed to start")
    assert repo.head_sha == head
    assert repo.is_clean


@pytest.mark.parametrize("staged", [False, True])
def test_foreign_changes_cannot_be_attributed_to_the_next_person(repo, hazard, author, staged):
    before = repo.head_sha
    foreign = repo.root / "docs" / "unreviewed.md"
    foreign.write_text("An uncommitted edit made outside Turva.")
    if staged:
        git.run(["add", "--", "docs/unreviewed.md"], cwd=repo.root)
    with pytest.raises(DirtyRepositoryError):
        repo.save_hazard(hazard, author)
    with pytest.raises(DirtyRepositoryError), repo.snapshot():
        pytest.fail("Uncommitted content was presented as evidence")
    assert repo.head_sha == before
    assert foreign.read_text() == "An uncommitted edit made outside Turva."
    assert repo.hazards() == []


@pytest.mark.parametrize("mutation", ["score", "residual", "status"])
def test_mutated_objects_are_revalidated_before_any_write(repo, hazard, author, mutation):
    if mutation == "score":
        hazard.initial.severity = True
    elif mutation == "residual":
        hazard.residual.severity = 5
    else:
        hazard.status = "not-a-status"
    before = repo.head_sha
    with pytest.raises((ValidationError, InvalidRiskScore)):
        repo.save_hazard(hazard, author)
    assert repo.head_sha == before
    assert repo.is_clean
    assert repo.hazards() == []


def test_commit_failure_is_preserved_and_blocks_a_later_save(repo, hazard, author, monkeypatch):
    from safety_file.errors import GitError

    before = repo.head_sha

    def fail(*args, **kwargs):
        raise GitError(["commit"], 1, "simulated failure")

    monkeypatch.setattr(git, "commit_all", fail)
    with pytest.raises(GitError):
        repo.save_hazard(hazard, author)
    assert repo.head_sha == before
    assert not repo.is_clean
    assert repo.hazard(hazard.id).title == hazard.title
    with pytest.raises(DirtyRepositoryError):
        SafetyFileRepository(repo.root).save_hazard(hazard, author)
