# Phase One Scope (Funded Build)

This is the scope of the funded phase-one build. It is deliberately narrower than [core-specification.md](core-specification.md), which describes Turva's full intent. Where the two disagree about what gets built, this document wins.

Rewritten after the October 2026 reboot meeting. The previous version, written against the original sponsor's brief, is in Git history; [What changed in the reboot](#what-changed-in-the-reboot) records the differences and why they matter.

## Provenance and governance

|                   |                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer**      | MBPCC Federation, a GP Federation incorporated as a Community Interest Company. The same Federation as the original arrangement, not a new customer. |
| **Funder**        | The Federation, £10,000.                                                                                                                             |
| **Consideration** | Lifetime unlimited use for the Federation and its member practices as at the date of agreement.                                                      |
| **Deadline**      | Not yet set. The original brief said Christmas 2026; whether that still stands is open.                                                              |
| **Status**        | Scope agreed at the October 2026 reboot meeting.                                                                                                     |

Requirements below are taken from the reboot brief. Anything marked _proposed_ is an engineering decision made to satisfy that brief, not something the customer specified, and can be changed without renegotiating scope.

## The problem being solved

A GP Federation deploying clinical software did not write that software and does not hold its hazard analysis. The supplier does, in a DCB0129 safety case. The Federation's own obligation is DCB0160: to assess the clinical risk of _deploying_ that system in _its_ setting, which means starting from the supplier's hazards and working out which of them survive contact with local reality, which are newly introduced by the deployment, and what the Federation will do about each.

Today that means a CSO reading a supplier PDF and retyping it into a spreadsheet. Turva's phase-one job is to take the supplier's DCB0129 in at one end and produce the Federation's DCB0160 at the other, leading the operator through the steps in between.

That framing matters for prioritisation: a feature that saves the CSO an hour beats a feature that models the domain more elegantly.

## Required capabilities

Six capabilities, in the order they occur in the workflow.

### 1. Login

A CSO can register, verify their email, and sign in.

Built. User model with Argon2 hashing, registration, email verification, password reset, session management and authentication middleware all exist and are tested.

### 2. CSO profile

A CSO can record the identity that will appear in the safety files they produce: name, organisation, job role, professional registration, and a declaration that they act as a Clinical Safety Officer.

Built. Turva records a self-declared designation and says so on the face of the generated document; it does not and cannot confer the role. See TH-009 in [SAFETY.md](../SAFETY.md).

### 3. Onboard the supplier's DCB0129 safety case

The CSO uploads the clinical safety case the software's manufacturer produced, and Turva extracts its hazards into the deployment file as a starting point.

Input formats are `.docx` and `.pdf`. OCR for scanned documents is a **stretch goal**: a safety case that exists only as a scan is likely rare, and the cost of OCR is not worth paying before a real example demands it.

This capability carries a hazard of its own. Extraction that silently drops or garbles a hazard produces a deployment safety case that is incomplete and _looks_ complete, which is worse than one that is obviously empty. Whatever is built must make the correspondence between source document and extracted hazard auditable by the CSO, and must never present an extraction as if it were a reading. Recorded as TH-010.

### 4. Guide the operator through the process

Step-by-step guidance, derived from published clinical safety guidance, that leads the operator through hazard log construction, safety workshops, and delegated hazard mitigation.

The guidance is derived from **NHS England's published clinical safety guidance, which is Open Government Licence**. Turva always references the NHSE source rather than paraphrasing it as though it were Turva's own: the operator needs to be able to follow the citation upstream, and OGL requires attribution in any case.

The brief's phrase is "leads the operator by the nose through the process of clinical safety". This is the heart of the product and the hardest thing in the scope to specify, because its quality bar is "a CSO who is not an expert can follow it and arrive somewhere defensible".

Three named activities:

- **Hazard log** - building and maintaining the log, with risk level derived from severity and likelihood, never entered. See [core-specification.md](core-specification.md).
- **Workshops** - the clinical safety workshop is where hazards are actually identified, by people in a room. **Turva does not host or record workshops.** Users already have MS Teams for video, their own premises for meeting in person, and OBS or Loom if they want a recording; building any of that would be duplicating tools the customer already has. Turva's part is to know when a workshop is due and to email the CSO telling them to arrange one. The workshop's output arrives back as hazards in the log.
- **Delegated hazard mitigation** - a hazard's mitigation is assigned to someone who is not the CSO, who completes it and returns it. This is the reboot's version of the original brief's "hand the portal to the customer", narrowed from a whole-file hand-off to a per-hazard assignment, which is both more useful and a smaller permission problem.

Guidance that walks someone through clinical safety can be mistaken for performing it. Automation bias is a real hazard in a guided tool and is recorded as TH-011.

### 5. Produce the DCB0160 deployment safety file

Turva outputs a DCB0160 clinical safety case file for the deployment: the Federation's own safety case, drawing on the supplier's DCB0129 but distinct from it.

This settles the largest open question in the previous scope, which asked which document the product was for. It is DCB0160, the deploying organisation's standard. DCB0129 is an input, not an output.

### 6. Single-document download

One button produces the whole safety file as a single downloadable document.

The information continues to live in the Zensical site in the repository; the download is a build artefact generated from it, and can be regenerated from the commit it came from.

The mechanism is proven, not proposed. It is working in `rcpch/digital-growth-charts-documentation`, which publishes <https://growth.rcpch.ac.uk>, and was read rather than assumed:

- Zensical has **no native PDF export** - tracked at [zensical/backlog#25](https://github.com/zensical/backlog/issues/25).
- A ~240-line exporter runs _after_ `zensical build`, reads the rendered HTML in `site/`, extracts each page's article element, applies one shared print stylesheet and renders through WeasyPrint.
- Dependencies are small: `weasyprint`, `beautifulsoup4`, `PyYAML`, plus the native libraries `libpango-1.0-0` and `libpangoft2-1.0-0`. Turva's web image will need those two packages added.
- It builds **two** documents from one site: the complete site, and a **controlled subset defined by an explicit page list**.

That last point is the one worth copying, and it is a safety property rather than a convenience. The RCPCH exporter keeps the safety document's contents as a hard-coded list so that adding a page to the site cannot silently change the reviewed scope of the safety PDF. Turva's DCB0160 download needs the same discipline: the document is an explicit, reviewed set of pages, not "whatever the site currently contains". Without it, editing a template would quietly alter what every safety case says.

_Proposed, and the one real difference from RCPCH:_ that project builds one site in CI on every push and serves a static file. Turva has many repositories and generates per safety file, so the build happens on commit or on first request and the result is cached against the commit SHA it was built from. A download must never be served from a different state than the commit it cites - see TH-007.

Later, and out of scope here: other formats such as `.docx` from the same pipeline, and eventually packaging the exporter as a Zensical plugin offered to the community. Given Zensical has no native export, that is a real contribution rather than a courtesy.

## AI features

Any AI feature is **Bring Your Own API Key**, configured at profile level, before anything else.

NHS organisations have well-founded sensitivities about where their data goes during an LLM round trip, and a deployment safety case contains a named organisation's assessment of its own clinical risk. BYOK makes the data path the customer's own decision and their own contractual relationship with the model provider.

An **MCP server or equivalent interface** is under consideration as an alternative or addition, letting the customer drive Turva from an AI client they already trust rather than Turva calling out to a model. This inverts the data flow, which is attractive for exactly the sensitivity above. Not yet specified.

Turva-hosted inference for paid subscriptions remains in [llm-strategy.md](llm-strategy.md) as a later option. It is not phase one.

## Architecture consequences

Each Clinical Safety Management File is its own Git repository on disk, containing a Zensical documentation site. The web application presents an ordinary web interface and performs the Git operations on the user's behalf; the CSO never sees a commit, a branch, or a merge. Architecturally this resembles a code-hosting platform: there is a database and a web application, but the substance of the product is files on disk under version control.

This means:

- **Git is the system of record.** Safety evidence lives in the repository. The audit trail required by `core-specification.md` is the commit history, attributed and timestamped, and it is immutable in the way regulators expect.
- **The database is an index, not the truth.** Postgres exists so projects can be listed, searched, and permission-checked quickly. It must be rebuildable from the repositories, which `reindex_safety_files` demonstrates. No safety evidence may exist only in a table.
- **The download is a build artefact.** It is generated from the repository contents, so any copy can be regenerated from the commit it came from.

See [architecture-principles.md](architecture-principles.md) and [ADR 0002](adr/0002-monolith-over-api-first.md).

## What changed in the reboot

Five of the six capabilities moved. The differences are worth stating because anyone working from the previous document, human or agent, will build the wrong thing.

| Previous brief                          | Reboot brief                                                                                    | Why it matters                                                                                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-assisted discovery of key data items | Onboard the supplier's existing DCB0129                                                         | The largest change, and it reduces risk rather than adding it. "Generate the right data items from nothing" has an unbounded quality bar; "extract hazards from a document the supplier already wrote" can be checked against the source. |
| Hand the whole portal to the customer   | Delegated hazard mitigation                                                                     | A per-hazard assignment rather than a whole-file hand-off. Smaller permission surface, and closer to how mitigation work is actually distributed.                                                                                         |
| "Step-by-step support", loosely stated  | Guidance derived from published guidance, naming hazard log, workshops and delegated mitigation | Now the centre of the product rather than a qualifier on another capability.                                                                                                                                                              |
| "A formal document we all recognise"    | A DCB0160 deployment safety file                                                                | Settles the previous document's highest-value open question.                                                                                                                                                                              |
| PDF export proposed, unproven           | Treated as solved, reused from another project                                                  | Changes it from a schedule risk to an integration task - if the reuse holds.                                                                                                                                                              |
| AI: BYOK **or** Turva-hosted            | BYOK first, MCP under consideration                                                             | Hosted inference is out of phase one. Data residency is the driver.                                                                                                                                                                       |

The customer did not change. MBPCC Federation is the same Federation as the original brief's, with the same £10,000 and the same lifetime-use consideration; the reboot restarted the work rather than replacing who it is for.

## Explicitly out of scope for phase one

Federation between organisations, upstream and downstream safety case inheritance, public project browsing and community search, incident management, review and approval workflow engines, RBAC beyond what the capabilities above require, Kubernetes, high availability, analytics and trend analysis, Turva-hosted inference, internationalisation, and plugin systems.

Deferred items are not cancelled. They are what the funded phase is meant to make possible.

## Settled at the reboot

Recorded because the answers shape the build, and because several were open long enough to be worth closing explicitly.

- **The customer is the same Federation as before**, MBPCC Federation, with the same £10,000 and the same lifetime-use consideration. This is a reboot of one arrangement, not a second customer alongside the first.
- **Turva does not host or record workshops.** See capability 4. The largest single scope reduction in the reboot.
- **The guidance source is NHS England, under Open Government Licence.** Turva references upstream rather than paraphrasing, and attributes as OGL requires.
- **The single-document download is a solved problem**, verified in `rcpch/digital-growth-charts-documentation` rather than taken on trust. See capability 6.

## Open questions for the customer

1. **Deadline.** The original brief said Christmas 2026. With capability 4 having no natural stopping point, the date is what decides how much of it gets built.
2. **Is a real DCB0129 available?** Being sought. One supplier safety case the customer actually holds is worth more than any amount of specification: capability 3's whole advantage is that its output can be checked against its input, and without a real input it is being built against an imagined one.
3. **Which clinical system is the first deployment?** It makes the demo concrete and determines whose DCB0129 is being onboarded.
4. **Who are the delegates?** Federation staff, member practice staff, or the supplier? It determines the identity assurance required and whether external accounts are needed at all in phase one.
5. **Does the safety case need to evidence that a workshop happened?** Turva is not running the workshop, but a DCB0160 submission is usually expected to show how hazards were identified. If a date and an attendee list belong in the document, Turva needs somewhere to record them - a small feature, but one nobody has asked for yet.

## Honest assessment

Capabilities 1 and 2 are built and tested. Capability 6 is claimed to be solved elsewhere and should be proved against a real safety file early, because everything else is judged through it.

The schedule risk is concentrated in capability 4. "Leads the operator by the nose" has no test that declares it done, and unlike the previous brief's AI discovery, it cannot be scaled down to a prompt and a text box without becoming the thing the customer said they did not want. It needs a defined stopping point before work starts.

Capability 3 is the most tractable of the new work, because its output can be checked against its input.
