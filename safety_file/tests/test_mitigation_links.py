"""TH-003/TH-004/TH-008: one relationship, one commit, no automatic risk change."""

from dataclasses import replace

import pytest

from safety_file import git
from safety_file.errors import GitError, StaleVersionError, ValidationError


@pytest.mark.parametrize("side", ["hazard", "mitigation"])
def test_either_writer_links_and_unlinks_both_sides_once(
    repo, hazard, mitigation, author, other_author, side
):
    repo.save_hazard(hazard, author)
    repo.save_mitigation(mitigation, author)
    previous = repo.head_sha
    if side == "hazard":
        item = replace(hazard, mitigations=[mitigation.id])
        save = repo.save_hazard
        unlinked = replace(item, mitigations=[])
    else:
        item = replace(mitigation, hazards=[hazard.id])
        save = repo.save_mitigation
        unlinked = replace(item, hazards=[])
    linked = save(item, other_author)
    assert len(repo.history()) == 4
    assert repo.hazard(hazard.id).mitigations == [mitigation.id]
    assert repo.mitigation(mitigation.id).hazards == [hazard.id]
    assert repo.hazard_history(hazard.id)[0].sha == linked
    assert repo.mitigation_history(mitigation.id)[0].sha == linked
    assert repo.history()[0].author_email == other_author.email
    assert repo.hazard(hazard.id).initial == hazard.initial
    assert repo.hazard(hazard.id).residual == hazard.residual
    assert repo.validate() == []
    assert repo.is_clean
    assert git.show(repo.root, previous, repo.path_for(hazard))

    before = repo.head_sha
    assert save(item, other_author) is None
    assert repo.head_sha == before
    save(unlinked, author)
    assert len(repo.history()) == 5
    assert repo.hazard(hazard.id).mitigations == []
    assert repo.mitigation(mitigation.id).hazards == []
    assert repo.validate() == []


def test_changing_links_keeps_unrelated_evidence_and_links(repo, hazard, mitigation, author):
    second = replace(hazard, id="HAZ-002", title="Second fictional hazard")
    repo.save_hazard(hazard, author)
    repo.save_hazard(second, author)
    original_body = repo.hazard(hazard.id).body
    repo.save_mitigation(replace(mitigation, hazards=[hazard.id, second.id]), author)
    repo.save_mitigation(replace(mitigation, id="MIT-002", hazards=[hazard.id]), author)
    repo.save_mitigation(replace(mitigation, hazards=[second.id]), author)
    assert repo.hazard(hazard.id).mitigations == ["MIT-002"]
    assert repo.hazard(second.id).mitigations == ["MIT-001"]
    assert repo.hazard(hazard.id).body == original_body
    assert repo.mitigation("MIT-001").evidence == mitigation.evidence
    assert repo.validate() == []


def test_missing_hazard_prevents_every_write(repo, hazard, mitigation, author):
    repo.save_hazard(hazard, author)
    original = repo.hazard(hazard.id)
    head = repo.head_sha
    with pytest.raises(ValidationError, match="HAZ-404"):
        repo.save_mitigation(replace(mitigation, hazards=[hazard.id, "HAZ-404"]), author)
    assert repo.head_sha == head
    assert repo.hazard(hazard.id) == original
    assert repo.mitigations() == []
    assert repo.is_clean


def test_stale_link_edit_is_rejected_before_touching_either_side(repo, hazard, mitigation, author):
    repo.save_hazard(hazard, author)
    stale = repo.head_sha
    repo.save_mitigation(mitigation, author)
    with pytest.raises(StaleVersionError), repo.edit(expected_head=stale):
        repo.save_mitigation(replace(mitigation, hazards=[hazard.id]), author)
    assert repo.hazard(hazard.id).mitigations == []
    assert repo.mitigation(mitigation.id).hazards == []
    assert repo.is_clean


def test_failed_commit_preserves_both_sides_for_inspection(
    repo, hazard, mitigation, author, monkeypatch
):
    repo.save_hazard(hazard, author)
    repo.save_mitigation(mitigation, author)
    before = repo.head_sha

    def fail(*args, **kwargs):
        raise GitError(["commit"], 1, "simulated failure")

    monkeypatch.setattr(git, "commit_all", fail)
    with pytest.raises(GitError):
        repo.save_mitigation(replace(mitigation, hazards=[hazard.id]), author)
    assert repo.head_sha == before
    assert not repo.is_clean
    assert repo.hazard(hazard.id).mitigations == [mitigation.id]
    assert repo.mitigation(mitigation.id).hazards == [hazard.id]


def test_withdrawing_a_control_does_not_remove_links_or_lower_risk(
    repo, hazard, mitigation, author
):
    repo.save_hazard(hazard, author)
    repo.save_mitigation(replace(mitigation, hazards=[hazard.id]), author)
    repo.save_mitigation(replace(repo.mitigation(mitigation.id), status="withdrawn"), author)
    assert repo.hazard(hazard.id).mitigations == [mitigation.id]
    assert repo.hazard(hazard.id).residual == hazard.residual
    assert repo.mitigation(mitigation.id).evidence == mitigation.evidence


@pytest.mark.parametrize("status", ["implemented", "verified"])
def test_evidenced_status_without_evidence_is_readable_but_cannot_be_saved(
    repo, mitigation, author, status
):
    from safety_file.models import Mitigation

    legacy = Mitigation.from_frontmatter(
        {**mitigation.to_frontmatter(), "status": status, "evidence": ""}
    )
    with pytest.raises(ValidationError, match="must record evidence"):
        repo.save_mitigation(legacy, author)
    assert repo.mitigations() == []
    assert repo.is_clean
