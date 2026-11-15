"""TH-004/TH-005: named accountability survives export and index loss."""

from dataclasses import replace
from uuid import uuid4

import pytest
import yaml

from safety_file import git
from safety_file.errors import DirtyRepositoryError, GitError, StaleVersionError, ValidationError
from safety_file.team import FileTeam, TeamPerson


@pytest.fixture
def team():
    return FileTeam(
        organisation_id=str(uuid4()),
        organisation_name="Fictional Riverbank Federation",
        accountable=TeamPerson(
            user_id=str(uuid4()),
            membership_id=str(uuid4()),
            appointment_id=str(uuid4()),
            name="Fictional Anita Patel",
            email="anita@riverbank.example.nhs.uk",
        ),
        collaborators=(),
        reason="Explicit fictional adoption.",
    )


def test_explicit_adoption_upgrades_only_manifest_and_team_in_one_commit(repo, team, author):
    old = repo.head_sha
    pages = {
        str(path.relative_to(repo.root)): path.read_bytes()
        for path in (repo.root / "docs").rglob("*.md")
    }
    with repo.edit(expected_head=old):
        repo.save_team(team, author)
    assert repo.manifest.schema_version == 2
    assert repo.team() == team
    assert repo.history()[0].author_email == author.email
    assert len(repo.history()) == 2
    assert repo.is_clean
    assert pages == {
        str(path.relative_to(repo.root)): path.read_bytes()
        for path in (repo.root / "docs").rglob("*.md")
    }
    assert "schema_version: 1" in repo.version_at(old, ".turva/manifest.yaml")
    assert (
        FileTeam.from_dict(yaml.safe_load(repo.version_at(repo.head_sha, ".turva/team.yaml")))
        == team
    )
    assert repo.save_team(team, author) is None


def test_legacy_is_not_automatically_adopted(repo, hazard, author):
    assert repo.manifest.schema_version == 1
    assert repo.team() is None
    repo.save_hazard(hazard, author)
    assert repo.manifest.schema_version == 1


def test_team_saves_share_stale_and_dirty_guards(repo, team, author):
    head = repo.head_sha
    repo.save_team(team, author)
    with pytest.raises(StaleVersionError), repo.edit(expected_head=head):
        repo.save_team(replace(team, reason="Stale decision"), author)
    (repo.root / "docs/index.md").write_text("Keep this unsaved work", encoding="utf-8")
    with pytest.raises(DirtyRepositoryError):
        repo.save_team(team, author)
    assert "Keep this" in (repo.root / "docs/index.md").read_text()


@pytest.mark.parametrize(
    "edit",
    [
        lambda data: data.update(extra="unsupported"),
        lambda data: data.update(accountable=None),
        lambda data: data.update(collaborators="not a list"),
        lambda data: data.update(reason=" "),
        lambda data: data.update(organisation_id="not-an-id"),
        lambda data: data["accountable"].update(appointment_id="bad"),
        lambda data: data["accountable"].update(email="not an email"),
        lambda data: data["collaborators"].append(data["accountable"]),
    ],
)
def test_invalid_or_extended_team_data_is_rejected(team, edit):
    data = team.to_dict()
    edit(data)
    with pytest.raises(ValidationError):
        FileTeam.from_dict(data)


def test_transfer_and_ignored_team_fail_before_touching_any_file(repo, team, author):
    ignore = repo.root / ".git/info/exclude"
    ignore.write_text(".turva/team.yaml\n")
    with pytest.raises(ValidationError, match="ignores"):
        repo.save_team(team, author)
    assert repo.manifest.schema_version == 1
    assert repo.is_clean
    ignore.write_text("")
    repo.save_team(team, author)
    before = repo.head_sha
    with pytest.raises(ValidationError, match="transfer"):
        repo.save_team(replace(team, organisation_id=str(uuid4())), author)
    assert repo.head_sha == before


def test_failed_commit_is_not_rolled_back_or_presented_as_committed(
    repo, team, author, monkeypatch
):
    head = repo.head_sha

    def fail(*args, **kwargs):
        raise GitError(["commit"], 1, "fictional failure")

    monkeypatch.setattr(git, "commit_all", fail)
    with pytest.raises(GitError):
        repo.save_team(team, author)
    assert repo.head_sha == head
    assert not repo.is_clean
    with pytest.raises(DirtyRepositoryError), repo.snapshot():
        pass


def test_missing_v2_team_and_stray_v1_team_are_never_empty_legacy_grants(repo, team, author):
    path = repo.root / ".turva/team.yaml"
    path.write_text(yaml.safe_dump(team.to_dict()))
    git.commit_all(repo.root, "test: stray v1 record", author)
    with pytest.raises(ValidationError, match="version-1"), repo.snapshot():
        pass
    path.unlink()
    git.commit_all(repo.root, "test: inspect and remove stray record", author)
    repo.save_team(team, author)
    path.unlink()
    git.commit_all(repo.root, "test: missing v2 team", author)
    with pytest.raises(ValidationError, match="requires"), repo.snapshot():
        pass
