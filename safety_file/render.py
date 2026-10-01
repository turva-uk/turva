"""Generation of the hazard log page.

The hazard log is derived from the individual hazard files, so it is generated
rather than edited. It is nonetheless committed: a reader who clones the
repository should see the log without running a build step, and the Zensical
site needs it as an ordinary page.

Derived values - risk level, outstanding-risk counts - are computed here from
severity and likelihood. None of them is read from disk, because none of them
is stored.
"""

from __future__ import annotations

from .models import Hazard, Mitigation
from .risk import LIKELIHOOD_LABELS, SEVERITY_LABELS, risk_level_label

GENERATED_BANNER = """<!-- GENERATED FILE - do not edit by hand.
     Produced from the individual hazard files in this directory.
     Edits here will be overwritten the next time a hazard is saved. -->"""


def _escape_cell(text: str) -> str:
    """Make a string safe for a Markdown table cell."""
    return text.replace("|", "\\|").replace("\n", " ").strip()


def render_hazard_log(
    *,
    hazards: list[Hazard],
    mitigations: list[Mitigation],
    name: str,
) -> str:
    """Render `docs/hazards/index.md`."""
    lines = [
        GENERATED_BANNER,
        "",
        "# Hazard log",
        "",
        f"Clinical safety hazards for **{name}**.",
        "",
    ]

    if not hazards:
        lines += [
            "No hazards have been recorded yet.",
            "",
            "An empty hazard log is not evidence of a safe system. It means the "
            "hazard identification described in the clinical risk management plan "
            "has not yet been done.",
            "",
        ]
        return "\n".join(lines)

    open_hazards = [hazard for hazard in hazards if hazard.status == "open"]
    blocking = [
        hazard for hazard in hazards if hazard.status == "open" and hazard.requires_elimination
    ]

    lines += [
        "## Summary",
        "",
        f"- Hazards recorded: **{len(hazards)}**",
        f"- Open: **{len(open_hazards)}**",
        f"- Closed: **{len([h for h in hazards if h.status == 'closed'])}**",
        f"- Transferred: **{len([h for h in hazards if h.status == 'transferred'])}**",
        f"- Mitigations: **{len(mitigations)}**",
        "",
    ]

    if blocking:
        identifiers = ", ".join(hazard.id for hazard in blocking)
        lines += [
            f'!!! danger "Residual risk requires elimination before go-live: {identifiers}"',
            "",
            "    These hazards have a derived residual risk level of 4 or 5. The "
            "clinical risk management plan does not permit go-live while they "
            "remain open.",
            "",
        ]
    else:
        lines += [
            '!!! success "No open hazard has a residual risk level requiring elimination"',
            "",
        ]

    lines += [
        "## Hazards",
        "",
        "Risk level is derived from severity and likelihood; it is not recorded "
        "separately and cannot be set by hand.",
        "",
        "| ID | Hazard | Status | Initial | Residual | Mitigations | Owner |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]

    for hazard in hazards:
        link = f"[{hazard.id}](#{hazard.id.lower()})"
        initial = f"S{hazard.initial.severity} L{hazard.initial.likelihood} → **{hazard.initial.risk_level}**"
        residual = f"S{hazard.residual.severity} L{hazard.residual.likelihood} → **{hazard.residual.risk_level}**"
        mitigation_refs = ", ".join(hazard.mitigations) or "-"
        lines.append(
            f"| {link} | {_escape_cell(hazard.title)} | {hazard.status} | {initial} "
            f"| {residual} | {mitigation_refs} | {_escape_cell(hazard.owner)} |"
        )

    lines += ["", "## Detail", ""]

    by_id = {mitigation.id: mitigation for mitigation in mitigations}

    for hazard in hazards:
        lines += [
            f"### {hazard.id}",
            "",
            f"**{_escape_cell(hazard.title)}**",
            "",
            f"- Status: {hazard.status}",
            f"- Owner: {hazard.owner}",
            f"- Last updated: {hazard.updated.isoformat()}",
            "",
        ]
        for label, value in (
            ("Cause", hazard.cause),
            ("Effect", hazard.effect),
            ("Potential harm", hazard.harm),
        ):
            if value:
                lines += [f"**{label}**", "", value.strip(), ""]

        lines += [
            "| Assessment | Severity | Likelihood | Derived risk level |",
            "| --- | --- | --- | --- |",
            f"| Initial | {hazard.initial.severity} ({SEVERITY_LABELS[hazard.initial.severity]}) "
            f"| {hazard.initial.likelihood} ({LIKELIHOOD_LABELS[hazard.initial.likelihood]}) "
            f"| {hazard.initial.risk_level} - {risk_level_label(hazard.initial.risk_level)} |",
            f"| Residual | {hazard.residual.severity} ({SEVERITY_LABELS[hazard.residual.severity]}) "
            f"| {hazard.residual.likelihood} ({LIKELIHOOD_LABELS[hazard.residual.likelihood]}) "
            f"| {hazard.residual.risk_level} - {risk_level_label(hazard.residual.risk_level)} |",
            "",
        ]

        if hazard.mitigations:
            lines += ["**Mitigations**", ""]
            for mitigation_id in hazard.mitigations:
                mitigation = by_id.get(mitigation_id)
                if mitigation is None:
                    lines.append(f"- {mitigation_id} - *missing*")
                else:
                    lines.append(
                        f"- **{mitigation_id}** ({mitigation.control_type}, "
                        f"{mitigation.status}) - {_escape_cell(mitigation.title)}"
                    )
            lines.append("")

        if hazard.justification:
            lines += ["**Justification of residual risk**", "", hazard.justification.strip(), ""]

    return "\n".join(lines)
