"""Domain objects for safety artefacts.

These mirror `specifications/safety-file-layout.md`. Validation lives here, in
the constructor, so an invalid object cannot exist: there is no window in which
a hazard with a severity of 9 is in memory waiting to be checked.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from .errors import ValidationError
from .risk import derive_risk_level

HAZARD_ID_PATTERN = re.compile(r"^HAZ-\d{3}$")
MITIGATION_ID_PATTERN = re.compile(r"^MIT-\d{3}$")

HAZARD_STATUSES = ("open", "closed", "transferred")
MITIGATION_STATUSES = ("proposed", "implemented", "verified", "withdrawn")

#: Hierarchy of controls, strongest first. Order is meaningful.
CONTROL_TYPES = ("elimination", "technical", "warning", "procedural")


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def _coerce_date(value: Any, name: str) -> date:
    """Accept a date or an ISO date string; reject anything else."""
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise ValidationError(f"{name} is not an ISO date: {value!r}") from exc
    raise ValidationError(f"{name} must be a date, got {type(value).__name__}")


@dataclass
class Assessment:
    """A severity and likelihood pair, with risk level derived from them."""

    severity: int
    likelihood: int

    def __post_init__(self) -> None:
        # Validate on construction so an invalid Assessment cannot exist. Doing
        # it here rather than when risk_level is first read means a bad score is
        # rejected at the point it enters the system, with a traceback that
        # points at the caller who supplied it.
        derive_risk_level(severity=self.severity, likelihood=self.likelihood)

    @property
    def risk_level(self) -> int:
        """Derived, never stored. See risk.py."""
        return derive_risk_level(severity=self.severity, likelihood=self.likelihood)

    def to_dict(self) -> dict[str, int]:
        """Serialise for frontmatter.

        Note what is absent: `risk_level`. It is a property, not a field, so it
        cannot be written to disk and later disagree with the values it came
        from.
        """
        return {"severity": self.severity, "likelihood": self.likelihood}

    @classmethod
    def from_dict(cls, data: Any, name: str) -> Assessment:
        _require(isinstance(data, dict), f"{name} must be a mapping")
        missing = {"severity", "likelihood"} - set(data)
        _require(not missing, f"{name} is missing {', '.join(sorted(missing))}")
        if "risk_level" in data:
            raise ValidationError(
                f"{name} must not contain 'risk_level'. Risk level is derived from "
                "severity and likelihood and is never stored; a stored value can "
                "disagree with the assessment it claims to summarise."
            )
        return cls(severity=data["severity"], likelihood=data["likelihood"])


@dataclass
class Hazard:
    """A potential source of harm, as recorded in one Markdown file."""

    id: str
    title: str
    status: str
    owner: str
    created: date
    updated: date
    initial: Assessment
    residual: Assessment
    cause: str = ""
    effect: str = ""
    harm: str = ""
    justification: str = ""
    mitigations: list[str] = field(default_factory=list)
    body: str = ""

    def __post_init__(self) -> None:
        self.created = _coerce_date(self.created, "created")
        self.updated = _coerce_date(self.updated, "updated")

        _require(
            bool(HAZARD_ID_PATTERN.match(self.id)),
            f"hazard id must look like HAZ-001, got {self.id!r}",
        )
        _require(bool(self.title.strip()), f"{self.id}: title must not be empty")
        _require(
            self.status in HAZARD_STATUSES,
            f"{self.id}: status must be one of {', '.join(HAZARD_STATUSES)}, got {self.status!r}",
        )

        # Layout rule 6. A control that makes a hazard more likely or more
        # severe is a modelling error or a transposition; either way it should
        # stop rather than be recorded as a safety improvement.
        _require(
            self.residual.severity <= self.initial.severity,
            f"{self.id}: residual severity ({self.residual.severity}) is greater "
            f"than initial severity ({self.initial.severity}). Mitigations cannot "
            "increase severity; if the risk genuinely rose, record a new "
            "assessment rather than editing this one.",
        )
        _require(
            self.residual.likelihood <= self.initial.likelihood,
            f"{self.id}: residual likelihood ({self.residual.likelihood}) is greater "
            f"than initial likelihood ({self.initial.likelihood}). Mitigations cannot "
            "increase likelihood; if the risk genuinely rose, record a new "
            "assessment rather than editing this one.",
        )

        # Layout rule 7.
        if self.status == "closed":
            _require(
                bool(self.justification.strip()),
                f"{self.id}: a closed hazard must record a justification. Hazards "
                "are never deleted, only closed with a reason.",
            )

        for mitigation_id in self.mitigations:
            _require(
                bool(MITIGATION_ID_PATTERN.match(mitigation_id)),
                f"{self.id}: mitigation reference must look like MIT-001, got {mitigation_id!r}",
            )

    @property
    def requires_elimination(self) -> bool:
        """Whether residual risk still blocks go-live."""
        return self.residual.risk_level >= 4

    def to_frontmatter(self) -> dict[str, Any]:
        """Key order here is the order fields appear in the file."""
        data: dict[str, Any] = {
            "id": self.id,
            "title": self.title,
            "status": self.status,
            "owner": self.owner,
            "created": self.created.isoformat(),
            "updated": self.updated.isoformat(),
        }
        for name in ("cause", "effect", "harm"):
            value = getattr(self, name)
            if value:
                data[name] = value
        data["initial"] = self.initial.to_dict()
        data["residual"] = self.residual.to_dict()
        if self.mitigations:
            data["mitigations"] = list(self.mitigations)
        if self.justification:
            data["justification"] = self.justification
        return data

    @classmethod
    def from_frontmatter(cls, data: dict[str, Any], body: str = "") -> Hazard:
        required = {"id", "title", "status", "owner", "created", "updated", "initial", "residual"}
        missing = required - set(data)
        _require(
            not missing,
            f"hazard is missing required fields: {', '.join(sorted(missing))}",
        )
        identifier = data["id"]
        return cls(
            id=identifier,
            title=data["title"],
            status=data["status"],
            owner=data["owner"],
            created=data["created"],
            updated=data["updated"],
            initial=Assessment.from_dict(data["initial"], f"{identifier}.initial"),
            residual=Assessment.from_dict(data["residual"], f"{identifier}.residual"),
            cause=data.get("cause", ""),
            effect=data.get("effect", ""),
            harm=data.get("harm", ""),
            justification=data.get("justification", ""),
            mitigations=list(data.get("mitigations", []) or []),
            body=body,
        )


@dataclass
class Mitigation:
    """A control measure reducing the likelihood or severity of harm."""

    id: str
    title: str
    status: str
    owner: str
    created: date
    updated: date
    control_type: str
    hazards: list[str] = field(default_factory=list)
    evidence: str = ""
    body: str = ""

    def __post_init__(self) -> None:
        self.created = _coerce_date(self.created, "created")
        self.updated = _coerce_date(self.updated, "updated")

        _require(
            bool(MITIGATION_ID_PATTERN.match(self.id)),
            f"mitigation id must look like MIT-001, got {self.id!r}",
        )
        _require(bool(self.title.strip()), f"{self.id}: title must not be empty")
        _require(
            self.status in MITIGATION_STATUSES,
            f"{self.id}: status must be one of {', '.join(MITIGATION_STATUSES)}, "
            f"got {self.status!r}",
        )
        _require(
            self.control_type in CONTROL_TYPES,
            f"{self.id}: control_type must be one of {', '.join(CONTROL_TYPES)}, "
            f"got {self.control_type!r}",
        )
        for hazard_id in self.hazards:
            _require(
                bool(HAZARD_ID_PATTERN.match(hazard_id)),
                f"{self.id}: hazard reference must look like HAZ-001, got {hazard_id!r}",
            )

    @property
    def control_strength(self) -> int:
        """Position in the hierarchy of controls. Lower is stronger."""
        return CONTROL_TYPES.index(self.control_type)

    def to_frontmatter(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": self.id,
            "title": self.title,
            "status": self.status,
            "owner": self.owner,
            "created": self.created.isoformat(),
            "updated": self.updated.isoformat(),
            "control_type": self.control_type,
        }
        if self.hazards:
            data["hazards"] = list(self.hazards)
        if self.evidence:
            data["evidence"] = self.evidence
        return data

    @classmethod
    def from_frontmatter(cls, data: dict[str, Any], body: str = "") -> Mitigation:
        required = {"id", "title", "status", "owner", "created", "updated", "control_type"}
        missing = required - set(data)
        _require(
            not missing,
            f"mitigation is missing required fields: {', '.join(sorted(missing))}",
        )
        return cls(
            id=data["id"],
            title=data["title"],
            status=data["status"],
            owner=data["owner"],
            created=data["created"],
            updated=data["updated"],
            control_type=data["control_type"],
            hazards=list(data.get("hazards", []) or []),
            evidence=data.get("evidence", ""),
            body=body,
        )


@dataclass
class Manifest:
    """`.turva/manifest.yaml` - the safety file's identity."""

    #: Bump when the on-disk layout changes incompatibly, and provide an upgrade.
    CURRENT_SCHEMA_VERSION = 1

    schema_version: int
    project_id: str
    name: str
    standard: str
    template: str
    template_version: int
    created: date

    def __post_init__(self) -> None:
        self.created = _coerce_date(self.created, "created")
        _require(
            self.standard in ("DCB0129", "DCB0160"),
            f"standard must be DCB0129 or DCB0160, got {self.standard!r}",
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "project_id": self.project_id,
            "name": self.name,
            "standard": self.standard,
            "template": self.template,
            "template_version": self.template_version,
            "created": self.created.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Manifest:
        required = {
            "schema_version",
            "project_id",
            "name",
            "standard",
            "template",
            "template_version",
            "created",
        }
        missing = required - set(data)
        _require(not missing, f"manifest is missing: {', '.join(sorted(missing))}")
        return cls(**{key: data[key] for key in required})
