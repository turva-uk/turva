"""Version-2 named accountability. These identities are evidence, not live grants.

An application must also check its current membership/appointment records. A
copied repository must never create accounts, appointments or access by itself.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any, Self
from uuid import UUID

from .errors import ValidationError


def _fields(data: object, expected: set[str], label: str) -> None:
    if not isinstance(data, dict) or set(data) != expected:
        raise ValidationError(f"{label} must contain exactly: {', '.join(sorted(expected))}")


def _text(value: object, label: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{label} must be non-empty text")


def _uuid(value: object, label: str) -> None:
    try:
        if not isinstance(value, str) or str(UUID(value)) != value:
            raise ValueError
    except ValueError:
        raise ValidationError(f"{label} must be a canonical UUID") from None


@dataclass(frozen=True)
class TeamPerson:
    user_id: str
    membership_id: str
    appointment_id: str
    name: str
    email: str

    def __post_init__(self) -> None:
        for field in ("user_id", "membership_id", "appointment_id"):
            _uuid(getattr(self, field), field)
        _text(self.name, "name")
        if not isinstance(self.email, str) or not re.fullmatch(
            r"[^\s@]+@[^\s@]+\.[^\s@]+", self.email
        ):
            raise ValidationError("A team identity needs an email address")

    @classmethod
    def from_dict(cls, data: Any) -> Self:
        _fields(
            data, {"user_id", "membership_id", "appointment_id", "name", "email"}, "team person"
        )
        return cls(**data)


@dataclass(frozen=True)
class FileTeam:
    organisation_id: str
    organisation_name: str
    accountable: TeamPerson
    collaborators: tuple[TeamPerson, ...]
    reason: str

    def __post_init__(self) -> None:
        _uuid(self.organisation_id, "organisation_id")
        _text(self.organisation_name, "organisation_name")
        _text(self.reason, "team change reason")
        if not isinstance(self.accountable, TeamPerson) or not isinstance(
            self.collaborators, tuple
        ):
            raise ValidationError("A file team needs one accountable CSO and a collaborator tuple")
        people = (self.accountable, *self.collaborators)
        if not all(isinstance(person, TeamPerson) for person in people):
            raise ValidationError("Every collaborator must be a named team identity")
        for field in ("user_id", "membership_id", "email"):
            if len({getattr(person, field) for person in people}) != len(people):
                raise ValidationError("Name each person only once in a file team")

    def to_dict(self) -> dict[str, Any]:
        return {
            "organisation_id": self.organisation_id,
            "organisation_name": self.organisation_name,
            "accountable": asdict(self.accountable),
            "collaborators": [asdict(person) for person in self.collaborators],
            "reason": self.reason,
        }

    @classmethod
    def from_dict(cls, data: Any) -> Self:
        _fields(
            data,
            {"organisation_id", "organisation_name", "accountable", "collaborators", "reason"},
            "file team",
        )
        if not isinstance(data["collaborators"], list):
            raise ValidationError("collaborators must be a list")
        return cls(
            organisation_id=data["organisation_id"],
            organisation_name=data["organisation_name"],
            accountable=TeamPerson.from_dict(data["accountable"]),
            collaborators=tuple(TeamPerson.from_dict(person) for person in data["collaborators"]),
            reason=data["reason"],
        )
