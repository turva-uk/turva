"""TH-004/005/006/009: administration, appointment and file authority differ."""

from __future__ import annotations

import hashlib
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from io import StringIO
from threading import Event
from uuid import uuid4

import pytest
import yaml
from django.contrib.auth.models import AnonymousUser
from django.core import mail
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management import call_command
from django.db import DatabaseError, close_old_connections, connection, transaction
from django.test import Client
from django.urls import reverse
from django.utils import timezone

import app.api.organisations as organisation_api
from app.api.tests.test_hazard_writes import VALUES as HAZARD
from app.api.tests.test_mitigation_writes import VALUES as MITIGATION
from app.api.tests.test_pdf_download import body, download
from app.api.tests.test_pdf_download import builds as builds
from app.api.tests.test_safety_files import a_safety_file, make_user
from app.organisations.models import Invitation, Membership
from app.organisations.services import (
    accept_invitation,
    invite_member,
    provision_organisation,
    revoke_invitation,
    update_membership,
)
from app.safetyfiles.access import can_manage_team, can_read, current_actor, named_membership
from app.safetyfiles.models import SafetyFile, Visibility
from app.safetyfiles.services import save_hazard, save_mitigation, visible_to
from app.safetyfiles.teams import save_file_team
from safety_file import Author, SafetyFileRepository, git
from safety_file.errors import ValidationError

pytestmark = pytest.mark.django_db


def declared_user(email):
    user = make_user(email)
    user.professional_regulator = "GMC"
    user.registration_number = "7654321"
    user.declare_cso(declared=True)
    user.save()
    return user


def appoint(organisation, admin, member, **changes):
    member.refresh_from_db()
    return update_membership(
        organisation,
        admin,
        member.pk,
        expected_revision=member.revision,
        active=changes.get("active", True),
        is_administrator=changes.get("is_administrator", False),
        is_cso=changes.get("is_cso", True),
    )


@pytest.fixture
def team_context():
    admin = make_user("administrator@riverbank.example.nhs.uk")
    organisation = provision_organisation("Fictional Riverbank Federation", admin)
    owner = declared_user("accountable@riverbank.example.nhs.uk")
    colleague = declared_user("collaborator@riverbank.example.nhs.uk")
    unnamed = declared_user("unnamed@riverbank.example.nhs.uk")
    members = []
    for user in (owner, colleague, unnamed):
        member = Membership.objects.create(organisation=organisation, user=user)
        members.append(appoint(organisation, admin, member))
    file = a_safety_file(owner)
    save_hazard(file, owner, HAZARD, expected_head=file.repository().head_sha)
    save_mitigation(file, owner, MITIGATION, expected_head=file.repository().head_sha)
    return {
        "admin": admin,
        "organisation": organisation,
        "owner": owner,
        "colleague": colleague,
        "unnamed": unnamed,
        "members": members,
        "file": file,
    }


def team_values(context, **changes):
    owner, colleague, _ = context["members"]
    values = {
        "organisation_id": str(context["organisation"].pk),
        "accountable_id": str(owner.pk),
        "collaborator_ids": [str(colleague.pk)],
        "expected_appointments": {
            str(owner.pk): str(owner.cso_appointment),
            str(colleague.pk): str(colleague.cso_appointment),
        },
        "reason": "Explicit fictional adoption and named collaboration.",
        "expected_head": context["file"].repository().head_sha,
    }
    return {**values, **changes}


def adopt(context):
    team, head = save_file_team(context["file"], context["owner"], **team_values(context))
    context["file"].refresh_from_db()
    return team, head


def endpoint(name, context, **extra):
    return reverse(f"v1:{name}", kwargs={"organisation_id": context["organisation"].pk, **extra})


def team_url(context):
    return reverse("v1:safety-file-team", kwargs={"slug": context["file"].slug})


def invite(client, context, email="invitee@riverbank.example.nhs.uk"):
    client.force_login(context["admin"])
    response = client.post(
        endpoint("organisation-invite", context), {"email": email}, content_type="application/json"
    )
    assert response.status_code == 201, response.content
    token = mail.outbox[-1].body.split("#")[1].split()[0]
    return Invitation.objects.get(pk=response.json()["invitation"]["id"]), token


def test_administration_history_names_members_but_not_people_only_invited(team_context):
    client = Client()
    owner = team_context["owner"]
    owner.first_name, owner.last_name = "Joseph", "Okafor"
    owner.save(update_fields=["first_name", "last_name"])
    outsider = make_user("s.whitlock@riverbank.example.nhs.uk", first="Sam", last="Whitlock")

    invite(client, team_context, email=outsider.email)
    events = client.get(endpoint("organisation-detail", team_context)).json()["events"]

    issued = next(event for event in events if event["action"] == "invitation.issued")
    changed = next(
        event
        for event in events
        if event["action"] == "membership.changed" and event["subject"] == owner.email
    )
    assert issued["subject"] == outsider.email
    assert issued["subject_name"] is None
    assert issued["actor_name"] == team_context["admin"].get_full_name()
    assert changed["subject_name"] == "Joseph Okafor"


def test_adopted_files_say_when_their_history_last_changed(team_context):
    client = Client()
    adopt(team_context)
    client.force_login(team_context["admin"])

    files = client.get(endpoint("organisation-detail", team_context)).json()["files"]

    latest = team_context["file"].repository().history(limit=1)[0].committed_at
    assert [set(value) for value in files] == [{"slug", "name", "last_updated"}]
    assert datetime.fromisoformat(files[0]["last_updated"]) == latest


def test_adopted_files_come_newest_first_and_unreadable_ones_last(monkeypatch, team_context):
    organisation = team_context["organisation"]
    owner = team_context["owner"]
    names = ["Fictional older", "Fictional newer", "Fictional unreadable"]
    for name in names:
        made = a_safety_file(owner, name=name)
        SafetyFile.objects.filter(pk=made.pk).update(organisation_unit=organisation)
    times = {
        "Fictional older": datetime(2026, 11, 1, tzinfo=UTC),
        "Fictional newer": datetime(2026, 11, 20, tzinfo=UTC),
        "Fictional unreadable": None,
    }
    monkeypatch.setattr(organisation_api, "last_updated", lambda value: times[value.name])

    files = organisation_api.file_data(organisation)

    assert [value["name"] for value in files] == [
        "Fictional newer",
        "Fictional older",
        "Fictional unreadable",
    ]


def accept(client, invitation, token):
    return client.post(
        reverse("v1:invitation-accept", kwargs={"invitation_id": invitation.pk}),
        {"token": token},
        content_type="application/json",
    )


def test_operator_bootstrap_does_not_appoint_a_cso_or_adopt_by_organisation_text(
    client, team_context
):
    context = team_context
    admin_member = Membership.objects.get(
        organisation=context["organisation"], user=context["admin"]
    )
    assert admin_member.is_administrator and not admin_member.cso_appointment
    assert not context["file"].team_managed
    assert not context["file"].organisation_unit_id
    assert context["file"].repository().team() is None
    client.force_login(context["admin"])
    assert client.get(reverse("v1:safety-file-list")).json() == []
    assert client.post(reverse("v1:organisation-list"), {"name": "Self-claimed"}).status_code == 405
    assert client.get(context["file"].get_absolute_url()).status_code == 404
    out = StringIO()
    call_command(
        "provision_organisation",
        name="A separate fictional practice",
        administrator=context["admin"].email,
        stdout=out,
    )
    assert "No safety-file access" in out.getvalue()


def test_verified_invitation_is_hashed_one_use_and_membership_only(client, team_context):
    invitation, token = invite(client, team_context)
    assert invitation.token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert token not in str(
        invitation_data := client.get(endpoint("organisation-detail", team_context)).json()
    )
    assert invitation_data["invitations"][0]["email"] == invitation.email
    invitee = declared_user(invitation.email)
    client.force_login(invitee)
    assert accept(client, invitation, token).status_code == 200
    member = Membership.objects.get(user=invitee, organisation=team_context["organisation"])
    assert member.active and not member.is_administrator and not member.cso_appointment
    assert accept(client, invitation, token).status_code == 400
    assert list(visible_to(invitee)) == []
    assert (
        member.organisation.events.filter(action="invitation.accepted", actor=invitee).count() == 1
    )


@pytest.mark.parametrize(
    "failure", ["wrong-identity", "unverified", "expired", "revoked", "bad-token", "issuer-revoked"]
)
def test_invitation_cannot_be_used_by_wrong_or_revoked_identity(client, team_context, failure):
    invitation, token = invite(client, team_context)
    invitee = make_user(invitation.email, verified=failure != "unverified")
    if failure == "wrong-identity":
        invitee = team_context["colleague"]
    elif failure == "expired":
        invitation.expires_at = timezone.now() - timedelta(seconds=1)
        invitation.save()
    elif failure == "revoked":
        assert (
            client.post(
                endpoint(
                    "organisation-invitation-revoke", team_context, invitation_id=invitation.pk
                )
            ).status_code
            == 200
        )
    elif failure == "bad-token":
        token = "wrong"
    elif failure == "issuer-revoked":
        Membership.objects.filter(pk=invitation.issuer_id).update(active=False)
    client.force_login(invitee)
    assert accept(client, invitation, token).status_code == (
        403 if failure == "unverified" else 400
    )
    invitation.refresh_from_db()
    assert invitation.accepted_at is None


def test_only_admins_invite_and_failed_delivery_keeps_cooldown(client, team_context, monkeypatch):
    from app.organisations import services

    client.force_login(team_context["owner"])
    assert (
        client.post(
            endpoint("organisation-invite", team_context),
            {"email": "new@example.org"},
            content_type="application/json",
        ).status_code
        == 403
    )
    monkeypatch.setattr(
        services, "send_mail", lambda *a, **k: (_ for _ in ()).throw(OSError("fictional failure"))
    )
    client.force_login(team_context["admin"])
    first = client.post(
        endpoint("organisation-invite", team_context),
        {"email": "new@example.org"},
        content_type="application/json",
    )
    assert first.status_code == 201 and first.json()["email_sent"] is False
    assert (
        client.post(
            endpoint("organisation-invite", team_context),
            {"email": "new@example.org"},
            content_type="application/json",
        ).status_code
        == 409
    )


def test_appointment_is_not_professional_verification_and_requires_declared_profile(
    client, team_context
):
    context = team_context
    invitee = make_user("not-declared@example.org")
    member = Membership.objects.create(organisation=context["organisation"], user=invitee)
    client.force_login(context["admin"])
    url = endpoint("organisation-member", context, member_id=member.pk)
    payload = {"expected_revision": 0, "active": True, "is_administrator": False, "is_cso": True}
    assert client.patch(url, payload, content_type="application/json").status_code == 400
    member.refresh_from_db()
    assert member.cso_appointment is None
    assert not context["owner"].registration_verified
    assert context["members"][0].eligible_cso
    payload["is_cso"] = False
    assert client.patch(url, payload, content_type="application/json").status_code == 200
    assert client.patch(url, payload, content_type="application/json").status_code == 409


def test_last_administrator_cannot_be_removed_and_members_cannot_escalate(client, team_context):
    member = Membership.objects.get(
        user=team_context["admin"], organisation=team_context["organisation"]
    )
    payload = {
        "expected_revision": member.revision,
        "active": False,
        "is_administrator": False,
        "is_cso": False,
    }
    url = endpoint("organisation-member", team_context, member_id=member.pk)
    client.force_login(team_context["admin"])
    assert client.patch(url, payload, content_type="application/json").status_code == 400
    client.force_login(team_context["owner"])
    assert (
        client.patch(
            url,
            {**payload, "active": True, "is_administrator": True},
            content_type="application/json",
        ).status_code
        == 403
    )
    other_org = provision_organisation("Separate fictional practice", team_context["colleague"])
    assert (
        client.get(
            reverse("v1:organisation-detail", kwargs={"organisation_id": other_org.pk})
        ).status_code
        == 404
    )


def test_adoption_records_team_in_git_and_a_collaborator_writes_as_themselves(client, team_context):
    context = team_context
    client.force_login(context["owner"])
    response = client.put(team_url(context), team_values(context), content_type="application/json")
    assert response.status_code == 200, response.content
    context["file"].refresh_from_db()
    assert context["file"].team_managed
    assert context["file"].organisation_unit == context["organisation"]
    assert context["file"].organisation == context["organisation"].name
    repository = context["file"].repository()
    assert repository.manifest.schema_version == 2
    assert repository.team().accountable.email == context["owner"].email
    client.force_login(context["colleague"])
    detail_url = reverse("v1:safety-file-detail", kwargs={"slug": context["file"].slug})
    assert client.get(detail_url).json()["can_edit"] is True
    hazard_url = reverse(
        "v1:hazard-detail", kwargs={"slug": context["file"].slug, "hazard_id": "HAZ-001"}
    )
    response = client.patch(
        hazard_url,
        {"title": "Colleague's fictional hazard judgement", "expected_head": repository.head_sha},
        content_type="application/json",
    )
    assert response.status_code == 200, response.content
    assert repository.history()[0].author_email == context["colleague"].email
    mitigation_url = reverse(
        "v1:mitigation-detail", kwargs={"slug": context["file"].slug, "mitigation_id": "MIT-001"}
    )
    assert (
        client.patch(
            mitigation_url,
            {"evidence": "Fictional colleague evidence", "expected_head": repository.head_sha},
            content_type="application/json",
        ).status_code
        == 200
    )
    assert repository.history()[0].author_email == context["colleague"].email
    assert repository.hazard("HAZ-001").residual.severity == HAZARD["residual"]["severity"]


@pytest.mark.parametrize("who", ["admin", "unnamed", "other-practice"])
def test_organisation_role_or_federation_name_never_grants_evidence_access(
    client, team_context, who
):
    adopt(team_context)
    user = team_context.get(who)
    if who == "other-practice":
        user = declared_user("practice-cso@example.org")
        other = provision_organisation(team_context["organisation"].name, user)
        Membership.objects.filter(organisation=other, user=user).update(
            cso_appointment=uuid4(), cso_declaration=user.cso_declared_at
        )
    client.force_login(user)
    file = team_context["file"]
    assert client.get(reverse("v1:safety-file-list")).json() == []
    assert (
        client.get(reverse("v1:safety-file-detail", kwargs={"slug": file.slug})).status_code == 404
    )
    assert client.get(file.get_absolute_url()).status_code == 404
    assert download(client, file).status_code == 404
    assert (
        client.post(
            reverse("v1:hazard-list", kwargs={"slug": file.slug}),
            {**HAZARD, "expected_head": file.repository().head_sha},
            content_type="application/json",
        ).status_code
        == 404
    )
    assert client.get(team_url(team_context)).status_code == (200 if who == "admin" else 404)


@pytest.mark.parametrize(
    "revocation", ["membership", "appointment", "account", "verification", "declaration"]
)
def test_revocation_blocks_old_session_drafts_and_cached_downloads(
    client, team_context, builds, revocation
):
    context = team_context
    adopt(context)
    client.force_login(context["colleague"])
    body(download(client, context["file"]))
    head = context["file"].repository().head_sha
    member = context["members"][1]
    if revocation in {"membership", "appointment"}:
        appoint(
            context["organisation"],
            context["admin"],
            member,
            active=revocation != "membership",
            is_cso=False,
        )
    else:
        field = {"account": "is_active", "verification": "is_verified", "declaration": "is_cso"}[
            revocation
        ]
        setattr(context["colleague"], field, False)
        context["colleague"].save(update_fields=[field])
    assert download(client, context["file"]).status_code in {403, 404}
    with pytest.raises(PermissionDenied):
        save_hazard(
            context["file"],
            context["colleague"],
            {"title": "A stale unauthorised decision"},
            expected_head=head,
            hazard_id="HAZ-001",
        )
    assert context["file"].repository().head_sha == head
    assert len(builds) == 1


def test_reappointment_does_not_revive_a_named_grant_until_explicit_team_save(client, team_context):
    context = team_context
    adopt(context)
    old_appointment = context["members"][1].cso_appointment
    appoint(context["organisation"], context["admin"], context["members"][1], is_cso=False)
    context["members"][1] = appoint(
        context["organisation"], context["admin"], context["members"][1]
    )
    assert context["members"][1].cso_appointment != old_appointment
    client.force_login(context["colleague"])
    assert list(visible_to(context["colleague"])) == []
    client.force_login(context["admin"])
    assert (
        client.put(
            team_url(context),
            team_values(context, reason="Explicitly name the newly appointed CSO."),
            content_type="application/json",
        ).status_code
        == 200
    )
    assert list(visible_to(context["colleague"])) == [context["file"]]


def test_stale_team_forms_and_old_appointment_choices_never_restore_access(client, team_context):
    context = team_context
    adopt(context)
    values = team_values(context)
    appoint(context["organisation"], context["admin"], context["members"][1], is_cso=False)
    context["members"][1] = appoint(
        context["organisation"], context["admin"], context["members"][1]
    )
    client.force_login(context["owner"])
    assert client.put(team_url(context), values, content_type="application/json").status_code == 409
    save_hazard(
        context["file"],
        context["owner"],
        {"title": "New fictional judgement"},
        hazard_id="HAZ-001",
        expected_head=values["expected_head"],
    )
    assert (
        client.put(
            team_url(context),
            team_values(context, expected_head=values["expected_head"]),
            content_type="application/json",
        ).status_code
        == 409
    )


def test_accountable_cso_can_be_replaced_without_giving_admin_clinical_authority(
    client, team_context
):
    context = team_context
    adopt(context)
    first, second, _ = context["members"]
    appoint(context["organisation"], context["admin"], first, is_cso=False)
    client.force_login(context["admin"])
    values = team_values(
        context,
        accountable_id=str(second.pk),
        collaborator_ids=[],
        expected_appointments={str(second.pk): str(second.cso_appointment)},
        reason="Replace an unavailable accountable CSO.",
    )
    assert client.put(team_url(context), values, content_type="application/json").status_code == 200
    assert context["file"].repository().team().accountable.user_id == str(context["colleague"].pk)
    assert context["file"].repository().history()[0].author_email == context["admin"].email
    assert list(visible_to(context["admin"])) == []
    assert list(visible_to(context["owner"])) == []


def test_failed_team_index_update_keeps_git_and_never_reinstates_legacy_owner(
    client, team_context, monkeypatch
):
    context = team_context
    old = context["file"].repository().head_sha
    original = SafetyFile.save

    def fail(self, *args, **kwargs):
        if "team_managed" in kwargs.get("update_fields", []):
            raise DatabaseError("fictional indexing failure")
        return original(self, *args, **kwargs)

    monkeypatch.setattr(SafetyFile, "save", fail)
    with pytest.raises(DatabaseError):
        adopt(context)
    assert context["file"].repository().head_sha != old
    assert context["file"].repository().team() is not None
    monkeypatch.undo()
    # Revoke the named legacy owner after a successful Git/failed DB adoption.
    appoint(context["organisation"], context["admin"], context["members"][0], is_cso=False)
    assert list(visible_to(context["owner"])) == []
    client.force_login(context["owner"])
    assert (
        client.get(
            reverse("v1:safety-file-detail", kwargs={"slug": context["file"].slug})
        ).status_code
        == 404
    )


def test_reindex_reconstructs_binding_without_creating_memberships_or_owner_fallback(team_context):
    context = team_context
    team, _ = adopt(context)
    identifier = context["file"].pk
    SafetyFile.objects.filter(pk=identifier).delete()
    call_command("reindex_safety_files", owner=context["admin"].email, stdout=StringIO())
    restored = SafetyFile.objects.get(pk=identifier)
    assert restored.team_managed and restored.organisation_unit == context["organisation"]
    assert restored.organisation == team.organisation_name
    assert restored.repository().team() == team
    assert list(visible_to(context["admin"])) == []
    assert list(visible_to(context["colleague"])) == [restored]
    count = Membership.objects.count()
    Membership.objects.filter(organisation=context["organisation"]).update(
        active=False, cso_appointment=None
    )
    call_command("reindex_safety_files", owner=context["admin"].email, stdout=StringIO())
    assert Membership.objects.count() == count
    assert list(visible_to(context["colleague"])) == []


def test_reindex_dry_run_reports_team_binding_repairs_without_changing_git_or_roles(team_context):
    context = team_context
    adopt(context)
    head = context["file"].repository().head_sha
    SafetyFile.objects.filter(pk=context["file"].pk).update(
        team_managed=False, organisation_unit=None, organisation="Outdated index text"
    )
    output = StringIO()
    call_command("reindex_safety_files", dry_run=True, stdout=output)
    assert "Would update" in output.getvalue()
    assert "metadata/index binding" in output.getvalue()
    context["file"].refresh_from_db()
    assert context["file"].team_managed is False
    call_command("reindex_safety_files", stdout=StringIO())
    context["file"].refresh_from_db()
    assert context["file"].team_managed
    assert context["file"].organisation == context["organisation"].name
    assert context["file"].repository().head_sha == head


def test_support_admin_cannot_bypass_a_managed_team_through_a_stale_index(team_context):
    from django.contrib.admin import AdminSite

    from app.safetyfiles.admin import SafetyFileAdmin

    context = team_context
    support = SafetyFileAdmin(SafetyFile, AdminSite())
    assert "owner" not in support.get_readonly_fields(None, context["file"])
    adopt(context)
    SafetyFile.objects.filter(pk=context["file"].pk).update(
        team_managed=False, organisation_unit=None
    )
    context["file"].refresh_from_db()
    readonly = support.get_readonly_fields(None, context["file"])
    assert "owner" in readonly and "visibility" in readonly
    (context["file"].repository_path / ".turva/team.yaml").write_text(
        "Uncommitted team requiring inspection."
    )
    assert "visibility" in support.get_readonly_fields(None, context["file"])


def test_revocation_during_pdf_render_is_checked_before_serving(
    client, team_context, builds, monkeypatch
):
    from app.safetyfiles import pdf_export

    context = team_context
    adopt(context)
    original = pdf_export.run_pdf_worker

    def render_then_revoke(job, directory):
        output = original(job, directory)
        appoint(context["organisation"], context["admin"], context["members"][1], is_cso=False)
        return output

    monkeypatch.setattr(pdf_export, "run_pdf_worker", render_then_revoke)
    client.force_login(context["colleague"])
    assert download(client, context["file"]).status_code == 404
    assert builds[0]["team"]["accountable"]["email"] == context["owner"].email


def test_csrf_and_strict_payloads_cover_organisation_and_team_writes(team_context):
    context = team_context
    client = Client(enforce_csrf_checks=True)
    client.force_login(context["owner"])
    assert (
        client.put(
            team_url(context), team_values(context), content_type="application/json"
        ).status_code
        == 403
    )
    client.get(reverse("v1:session"))
    csrf = {"X-CSRFToken": client.cookies["csrftoken"].value}
    assert (
        client.put(
            team_url(context),
            {**team_values(context), "registration_verified": True},
            content_type="application/json",
            headers=csrf,
        ).status_code
        == 400
    )
    assert (
        client.put(
            team_url(context), team_values(context), content_type="application/json", headers=csrf
        ).status_code
        == 200
    )
    client.force_login(context["admin"])
    assert (
        client.post(
            endpoint("organisation-invite", context),
            {"email": "new@example.org"},
            content_type="application/json",
        ).status_code
        == 403
    )


def test_declaration_withdrawal_and_renewal_needs_both_reappointment_and_renaming(team_context):
    context = team_context
    adopt(context)
    member = context["members"][1]
    user = context["colleague"]
    old_declaration = user.cso_declared_at
    user.declare_cso(declared=False)
    user.save()
    user.declare_cso(declared=True)
    user.save()
    assert user.cso_declared_at != old_declaration
    assert not Membership.objects.get(pk=member.pk).eligible_cso
    assert list(visible_to(user)) == []
    member = appoint(context["organisation"], context["admin"], member)
    assert member.eligible_cso
    assert list(visible_to(user)) == []


def test_membership_removal_and_verified_rejoining_never_revives_file_grants(client, team_context):
    context = team_context
    adopt(context)
    member = context["members"][1]
    appoint(context["organisation"], context["admin"], member, active=False, is_cso=False)
    invitation, token = invite(client, context, context["colleague"].email)
    client.force_login(context["colleague"])
    assert accept(client, invitation, token).status_code == 200
    member.refresh_from_db()
    assert member.active and member.cso_appointment is None
    member = appoint(context["organisation"], context["admin"], member)
    assert member.eligible_cso and list(visible_to(context["colleague"])) == []


@pytest.mark.parametrize(
    "changes",
    [
        {"collaborator_ids": []},
        {"collaborator_ids": ["duplicate"]},
        {"reason": " "},
        {"organisation_id": str(uuid4())},
        {"accountable_id": str(uuid4())},
    ],
)
def test_incomplete_or_invalid_team_choices_never_write_a_partial_team(
    client, team_context, changes
):
    context = team_context
    client.force_login(context["owner"])
    head = context["file"].repository().head_sha
    values = team_values(context, **changes)
    assert client.put(team_url(context), values, content_type="application/json").status_code in {
        400,
        403,
        409,
    }
    assert context["file"].repository().head_sha == head
    assert context["file"].repository().team() is None


def test_admin_cannot_adopt_another_owners_legacy_file_or_a_collaborator_manage_the_team(
    client, team_context
):
    context = team_context
    client.force_login(context["admin"])
    assert (
        client.put(
            team_url(context), team_values(context), content_type="application/json"
        ).status_code
        == 404
    )
    adopt(context)
    client.force_login(context["colleague"])
    assert client.get(team_url(context)).json()["can_manage"] is False
    assert (
        client.put(
            team_url(context), team_values(context), content_type="application/json"
        ).status_code
        == 403
    )


def test_an_unchanged_team_save_adds_no_commit_and_removing_a_collaborator_keeps_all_evidence(
    client, team_context
):
    context = team_context
    adopt(context)
    file = context["file"]
    head = file.repository().head_sha
    client.force_login(context["owner"])
    assert (
        client.put(
            team_url(context), team_values(context), content_type="application/json"
        ).status_code
        == 200
    )
    assert file.repository().head_sha == head
    before = file.repository().hazard("HAZ-001")
    owner = context["members"][0]
    payload = team_values(
        context,
        collaborator_ids=[],
        expected_appointments={str(owner.pk): str(owner.cso_appointment)},
        reason="Remove a collaborator without changing clinical evidence.",
    )
    assert (
        client.put(team_url(context), payload, content_type="application/json").status_code == 200
    )
    assert file.repository().hazard("HAZ-001") == before
    assert file.repository().mitigation("MIT-001").evidence == MITIGATION["evidence"]
    assert list(visible_to(context["colleague"])) == []


def test_recovery_with_no_matching_live_organisation_does_not_grant_the_fallback_owner(
    team_context,
):
    context = team_context
    team, _ = adopt(context)
    repository = context["file"].repository()
    # Simulate moving the repository to a deployment with no matching organisation.
    data = team.to_dict()
    data["organisation_id"] = str(uuid4())
    (repository.root / ".turva/team.yaml").write_text(yaml.safe_dump(data))
    git.commit_all(
        repository.root,
        "test: repository from another deployment",
        author=Author("Fictional operator", context["admin"].email),
    )
    SafetyFile.objects.filter(pk=context["file"].pk).delete()
    call_command("reindex_safety_files", owner=context["admin"].email, stdout=StringIO())
    restored = SafetyFile.objects.get(pk=context["file"].pk)
    assert restored.team_managed and restored.organisation_unit_id is None
    assert list(visible_to(context["admin"])) == []
    with pytest.raises(PermissionDenied):
        save_hazard(restored, context["admin"], HAZARD, expected_head=repository.head_sha)


def test_team_service_checks_authority_and_identity_even_without_http(team_context):
    context = team_context
    values = team_values(context)
    with pytest.raises(ValidationError, match="version"):
        save_file_team(context["file"], context["owner"], **{**values, "expected_head": ""})
    with pytest.raises(PermissionDenied):
        save_file_team(context["file"], context["admin"], **values)
    with pytest.raises(ValidationError, match="only once"):
        save_file_team(
            context["file"],
            context["owner"],
            **{**values, "collaborator_ids": [values["accountable_id"]]},
        )
    colleague = context["members"][1]
    with pytest.raises(ValidationError, match="legacy owner"):
        save_file_team(
            context["file"],
            context["owner"],
            **{
                **values,
                "accountable_id": str(colleague.pk),
                "collaborator_ids": [],
                "expected_appointments": {str(colleague.pk): str(colleague.cso_appointment)},
            },
        )
    adopt(context)
    other = provision_organisation("A separate practice", context["owner"])
    with pytest.raises(ValidationError, match="transferred"):
        save_file_team(
            context["file"], context["owner"], **team_values(context, organisation_id=str(other.pk))
        )


def test_anonymous_public_and_unreadable_team_policy_fails_closed(team_context):
    context = team_context
    team, _ = adopt(context)
    anonymous = AnonymousUser()
    assert current_actor(anonymous) is None
    assert named_membership(team, anonymous) is None
    assert can_manage_team(context["file"], anonymous, context["file"].repository()) is False
    assert list(visible_to(anonymous)) == []
    context["file"].visibility = Visibility.PUBLIC
    context["file"].save(update_fields=["visibility"])
    assert can_read(context["file"], anonymous, context["file"].repository())
    assert list(visible_to(context["unnamed"])) == [context["file"]]
    assert list(visible_to(anonymous)) == [context["file"]]
    context["file"].visibility = Visibility.PRIVATE
    context["file"].save(update_fields=["visibility"])
    (context["file"].repository_path / ".turva/team.yaml").write_text(
        "Unreadable uncommitted evidence."
    )
    assert list(visible_to(context["owner"])) == []


@pytest.mark.parametrize("identity", ["anonymous", "unverified", "inactive"])
def test_organisation_services_never_trust_a_stale_or_unverified_actor(team_context, identity):
    actor = team_context["admin"]
    if identity == "anonymous":
        actor = AnonymousUser()
    else:
        field = "is_verified" if identity == "unverified" else "is_active"
        setattr(actor, field, False)
        actor.save(update_fields=[field])
        # Restore only the in-memory flag; the service must read the database.
        setattr(actor, field, True)
    with pytest.raises(PermissionDenied):
        provision_organisation("Fictional unauthorised organisation", actor)


def test_role_services_reject_removed_members_invalid_booleans_and_unknown_invites(team_context):
    context = team_context
    member = context["members"][1]
    with pytest.raises(DjangoValidationError, match="name"):
        provision_organisation(" ", context["admin"])
    with pytest.raises(DjangoValidationError, match="booleans"):
        update_membership(
            context["organisation"],
            context["admin"],
            member.pk,
            expected_revision=member.revision,
            active="yes",
            is_administrator=False,
            is_cso=False,
        )
    with pytest.raises(DjangoValidationError, match="removed member"):
        appoint(context["organisation"], context["admin"], member, active=False, is_cso=True)
    appoint(context["organisation"], context["admin"], member, active=False, is_cso=False)
    with pytest.raises(DjangoValidationError, match="Invite"):
        appoint(context["organisation"], context["admin"], member)
    with pytest.raises(DjangoValidationError, match="already an active member"):
        invite_member(context["organisation"], context["admin"], context["owner"].email)
    with pytest.raises(DjangoValidationError, match="invalid"):
        accept_invitation(uuid4(), context["owner"], "unknown")


def test_admin_demotion_permanently_revokes_their_pending_invites(client, team_context):
    context = team_context
    invitation, token = invite(client, context)
    second_admin = appoint(
        context["organisation"], context["admin"], context["members"][0], is_administrator=True
    )
    original_admin = Membership.objects.get(
        organisation=context["organisation"], user=context["admin"]
    )
    appoint(
        context["organisation"],
        second_admin.user,
        original_admin,
        is_administrator=False,
        is_cso=False,
    )
    invitation.refresh_from_db()
    assert invitation.revoked_at
    # A second revocation is a harmless no-op, not an audit rewrite.
    before = context["organisation"].events.count()
    revoke_invitation(context["organisation"], second_admin.user, invitation.pk)
    assert context["organisation"].events.count() == before
    invitee = make_user(invitation.email)
    client.force_login(invitee)
    assert accept(client, invitation, token).status_code == 400


def test_invalid_mail_origin_is_visible_and_does_not_send_an_invitation(team_context, settings):
    settings.FRONTEND_BASE_URL = "not-an-origin"
    with pytest.raises(DjangoValidationError, match="absolute HTTP"):
        invite_member(team_context["organisation"], team_context["admin"], "new-person@example.org")
    assert not mail.outbox


def test_legacy_files_stay_owner_controlled_and_unversioned_service_saves_are_refused(team_context):
    context = team_context
    assert list(visible_to(context["owner"])) == [context["file"]]
    assert list(visible_to(context["colleague"])) == []
    with pytest.raises(ValidationError, match="version"):
        save_hazard(context["file"], context["owner"], HAZARD, expected_head="")
    with pytest.raises(PermissionDenied):
        save_hazard(
            context["file"],
            AnonymousUser(),
            HAZARD,
            expected_head=context["file"].repository().head_sha,
        )


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("revocation", ["appointment", "profile-declaration"])
def test_revocation_cannot_overtake_an_already_authorised_attributable_save(
    team_context, monkeypatch, revocation
):
    """Real PostgreSQL row locks, not a mocked permission-check ordering."""
    context = team_context
    adopt(context)
    entered, release = Event(), Event()
    original = SafetyFileRepository.save_hazard

    def pause_at_storage(repository, hazard, author, **kwargs):
        entered.set()
        assert release.wait(timeout=10), "Test did not release the authorised writer"
        return original(repository, hazard, author, **kwargs)

    monkeypatch.setattr(SafetyFileRepository, "save_hazard", pause_at_storage)
    head = context["file"].repository().head_sha

    def write():
        close_old_connections()
        try:
            return save_hazard(
                context["file"],
                context["colleague"],
                {"title": "Fictional in-flight authorised judgement"},
                expected_head=head,
                hazard_id="HAZ-001",
            )
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=1) as executor:
        writer = executor.submit(write)
        try:
            assert entered.wait(timeout=10)
            # A server-side lock timeout makes this assertion deterministic:
            # without the correct row lock, the revocation would succeed now.
            with pytest.raises(DatabaseError), transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("SET LOCAL lock_timeout = '100ms'")
                if revocation == "appointment":
                    appoint(
                        context["organisation"],
                        context["admin"],
                        context["members"][1],
                        is_cso=False,
                    )
                else:
                    type(context["colleague"]).objects.filter(pk=context["colleague"].pk).update(
                        is_cso=False
                    )
        finally:
            release.set()
        writer.result(timeout=10)
    assert context["file"].repository().history()[0].author_email == context["colleague"].email
    if revocation == "appointment":
        appoint(context["organisation"], context["admin"], context["members"][1], is_cso=False)
    else:
        type(context["colleague"]).objects.filter(pk=context["colleague"].pk).update(is_cso=False)
    with pytest.raises(PermissionDenied):
        save_hazard(
            context["file"],
            context["colleague"],
            HAZARD,
            expected_head=context["file"].repository().head_sha,
        )
