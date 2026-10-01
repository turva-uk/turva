# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately. Do not open a public issue, and do not include credentials, exploit details, or any patient or personal data in a public channel.

Use [GitHub private vulnerability reporting](https://github.com/turva-uk/turva/security/advisories/new) for this repository. If that is unavailable, contact the maintainers through the organisation page at <https://github.com/turva-uk>.

Please include, as far as you can:

- What you found and where
- How to reproduce it
- What an attacker could achieve
- Any suggested remediation

We will acknowledge your report, keep you informed while we investigate, and credit you when a fix is published unless you would rather remain anonymous.

## Scope

In scope: this repository, and any Turva instance the maintainers operate.

Turva holds clinical safety evidence, which can be commercially sensitive and can describe weaknesses in live healthcare systems. Issues affecting confidentiality of a private safety file, integrity of the audit trail, or the correctness of access control between organisations are taken seriously even where the immediate impact looks low.

Out of scope: denial of service through traffic volume, findings from automated scanners without a demonstrated impact, and social engineering of maintainers.

## Supported versions

Turva is pre-release and has no supported versions yet. Only the `main` branch receives fixes. See [SAFETY.md](SAFETY.md) for the current safety status.

## Testing

Please do not test against an instance you do not own. Run Turva locally - see the [README](README.md) - and test there.

## Related

- [SAFETY.md](SAFETY.md) - clinical safety considerations, including hazards relating to audit trail integrity and unauthorised access
