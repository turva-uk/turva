# Turva

**Clinical safety documentation brought into the 21st century.**

<p align="center">
  <img src="./docs/docs/assets/turva-solid-yellow-purple-master-logo.png" alt="Turva Logo" width="150">
</p>

[![Licence: AGPL v3](https://img.shields.io/badge/licence-AGPL--3.0-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-turva--uk.github.io-purple)](https://turva-uk.github.io/turva/)

## What is this?

Turva manages clinical safety evidence for healthcare IT systems: hazards, risk assessments, mitigations, and safety cases, with an audit trail that can withstand regulatory scrutiny.

Traditional clinical risk management runs on Word documents, spreadsheets and email threads, which have no reliable version history and no record of who decided what, or when. Turva treats safety evidence as structured, version-controlled data instead.

**Each Clinical Safety Management File is its own Git repository**, holding a documentation site in Markdown. The commit history _is_ the audit trail. The web application performs the Git operations for you, so a Clinical Safety Officer never has to see a commit. Architecturally this is closer to a code-hosting platform than to a conventional web app: there is a database, but the substance of the product is files on disk under version control.

## What is it not?

- Not clinical decision support, and not a patient-facing system
- It does not process patient data
- It does not replace a Clinical Safety Officer, clinical competence, or professional judgement
- It does not certify that a system is safe; it helps a CSO build and evidence that argument
- It does not guarantee regulatory compliance, though it supports DCB0129 and DCB0160 processes

## Who is it for?

Clinical Safety Officers, and the development and deployment teams they work with, in NHS and NHS-adjacent organisations. Also auditors and regulators who need to review how a safety decision was reached.

## Status

**Pre-release, under active development.** Not yet suitable for a safety case an organisation will rely on. See [SAFETY.md](SAFETY.md) for the current safety status and known hazards, and [specifications/phase-one-scope.md](specifications/phase-one-scope.md) for what is being built now.

## Quick start

Requires [Docker Engine](https://docs.docker.com/engine/install/) and Docker Compose.

```bash
git clone git@github.com:turva-uk/turva.git
cd turva
cp app/.env.example app/.env    # then edit as needed
./s/manage migrate              # create the database tables
./s/up
```

The application is served at <http://localhost> through Caddy, and directly at <http://localhost:8000>.

## Testing and contributing

```bash
./s/test      # run the test suite in the api container
./s/lint      # everything CI enforces: pre-commit, then the Zizmor Actions audit
./s/docs      # serve the documentation site at http://localhost:8001
```

See [s/README.md](s/README.md) for all convenience scripts, [DEVELOPMENT.md](DEVELOPMENT.md) for development notes, and [AGENTS.md](AGENTS.md) for the project invariants - worth reading before your first change whether or not you are an AI agent.

Report security issues privately as described in [SECURITY.md](SECURITY.md).

## Documentation

Full documentation: <https://turva-uk.github.io/turva/>

- [Specifications](specifications/) - domain model, architecture principles, scope
- [SAFETY.md](SAFETY.md) - Turva's own clinical safety file

## Licence

Code is licensed under the [GNU Affero General Public License v3.0](LICENSE).

Written documentation is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
