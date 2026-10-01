# Phase One Scope (Funded Build)

This is the scope of the funded phase-one build. It is deliberately narrower than [core-specification.md](core-specification.md), which describes Turva's full intent. Where the two disagree about what gets built before Christmas, this document wins.

## Provenance and governance

|                                  |                                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Sponsor / SRO / key customer** | The Clinical Safety Officer commissioning the work. Acts as Senior Responsible Officer and as the first customer. |
| **Funder**                       | The sponsor's GP Federation, £10,000.                                                                             |
| **Consideration**                | Lifetime unlimited use for the Federation and its member practices as at the date of agreement.                   |
| **Deadline**                     | Phase one ready by Christmas 2026.                                                                                |
| **Status**                       | Accepted by all parties as a first iteration, with further learning and collaboration expected.                   |

Requirements below are taken from the sponsor's brief. Anything marked _proposed_ is an engineering decision made to satisfy that brief, not something the sponsor specified, and can be changed without renegotiating scope.

## The problem being solved

The sponsor can already understand and reason about the risks of a technology deployment. What they lack is a product that does the heavy lifting, so that Clinical Safety Officer work becomes cost-effective at scale across the NHS family. Turva's phase-one job is to remove labour from CSO work, not to teach clinical safety.

That framing matters for prioritisation: a feature that saves the CSO an hour beats a feature that models the domain more elegantly.

## Required capabilities

Six capabilities, in the order they occur in the workflow.

### 1. Web-based sign-on

A CSO can register, verify their email, and sign in.

Largely already built: user model with Argon2 hashing, registration, email verification, session management, and authentication middleware all exist and are tested. Password reset does not exist and is required before real users arrive.

### 2. Create a shell project

A CSO can create a new, empty Clinical Safety Management File for a system under assessment.

_Proposed:_ creating a project creates a Git repository on disk containing a Zensical documentation site scaffolded from a template. See [Architecture consequences](#architecture-consequences).

### 3. AI-assisted discovery of key data items

The system proposes the key data items a safety case needs for the system under assessment, rather than presenting the CSO with an empty form.

The sponsor specified that AI is either **BYOK** (the customer supplies their own API key) or **provided by Turva via API for paid subscriptions**. Both must be supported; BYOK is the simpler path and should work first.

### 4. Hand the portal to the customer to fill gaps

The CSO can pass the part-populated file to the customer organisation, which completes the data items the AI could not determine, then returns it.

This introduces a second role that the current domain model does not have. `core-specification.md` describes Projects, Organizations and Clinical Safety Officers, but no customer who is granted scoped, temporary access to complete specific fields and nothing else. Phase one needs that role, the hand-off in both directions, and a clear indication to each party of whose turn it is.

### 5. Return to the CSO for risk and issue management

The CSO identifies and manages hazards, risks and issues, with step-by-step support and as much automation as is cheaply achievable in phase one.

"Step-by-step support" is an explicit requirement, not a nice-to-have: the product is meant to walk a CSO through the process. The derived risk level rule from `core-specification.md` applies - severity and likelihood are entered, risk level is calculated, never chosen.

"As much automation as is easily provided in phase 1" is an explicit licence to defer. Where automation is not cheap, a guided manual step is an acceptable phase-one answer.

### 6. Produce the formal document

On completion the system produces a PDF that the clinical safety community recognises as a safety case.

_Proposed mechanism_, following the pattern the sponsor cited at <https://growth.rcpch.ac.uk>: build the project's Zensical site, then run WeasyPrint over the built HTML to produce a single PDF. That site is built from the same Zensical stack already used for Turva's own documentation, so the approach is proven on this exact toolchain rather than merely plausible. Its implementation keeps WeasyPrint and its native libraries inside a container, which is worth copying.

## Architecture consequences

The sponsor's statement that _"the CSO docs will be a Zensical site, tracked in Git"_ fixes the storage architecture, and it is the single most consequential sentence in the brief.

Each Clinical Safety Management File is its own Git repository on disk, containing a Zensical documentation site. The web application presents an ordinary web interface and performs the Git operations on the user's behalf; the CSO never sees a commit, a branch, or a merge. Architecturally this resembles a code-hosting platform: there is a database and a web application, but the substance of the product is files on disk under version control.

This means:

- **Git is the system of record.** Safety evidence lives in the repository. The audit trail required by `core-specification.md` is the commit history, attributed and timestamped, and it is immutable in the way regulators expect.
- **The database is an index, not the truth.** Postgres exists so projects can be listed, searched, and permission-checked quickly. It must be rebuildable from the repositories. No safety evidence may exist only in a table.
- **The PDF is a build artefact.** It is generated from the repository contents, so any PDF can be regenerated from the commit it came from.

This design was documented in `archive/architecture/vmpt.md` and was lost when the specifications were rationalised in December - the rationalisation removed the "VMPT stack" framing, which was fair, but removed the architecture along with it. The active specifications currently imply a conventional database-backed CRUD application, including "Database as Bottleneck" guidance in `architecture-principles.md`. **That contradiction must be resolved in the specifications before implementation starts**, or anyone reading them, human or agent, will build the wrong thing.

## Explicitly out of scope for phase one

From `roadmap.md`, deferred: federation between organisations, upstream and downstream safety case inheritance, public project browsing and community search, incident management, review and approval workflow engines, RBAC beyond what capabilities 1-5 require, Kubernetes, high availability, analytics and trend analysis, hazard recommendation engines, internationalisation, plugin systems, and import of external hazard logs.

Deferred items are not cancelled. They are what the funded phase is meant to make possible.

## Open questions for the sponsor

1. **Which document, precisely?** "A formal document that we all recognise" needs pinning to a specific artefact: a DCB0160 Clinical Safety Case Report, a DCB0129 one, a Hazard Log, or a combined pack. The template is the deliverable, so this is the highest-value question to settle first.
2. **Who is the customer in capability 4?** A member practice, a supplier, or an ICB? It determines how access is granted and how much identity assurance is needed.
3. **Does the lifetime grant include Turva-provided AI?** "Lifetime unlimited use" against a one-off £10,000 is unbounded ongoing cost if the Federation uses Turva's hosted LLM rather than BYOK. Simplest resolution: the lifetime grant covers the platform, and hosted inference is either BYOK or separately subscribed.
4. **How many member practices?** It sizes both the deployment and the support expectation.
5. **Is a worked example available?** One completed safety case the sponsor considers good would be worth more than any amount of specification for shaping the templates and the AI prompts.

## Honest assessment of the deadline

Roughly twelve weeks to Christmas. The authentication layer is real and tested; essentially everything else in this document is not yet built.

The two capabilities carrying genuine schedule risk are AI-assisted discovery (3) and the customer hand-off (4). Discovery is open-ended - the quality bar is "useful to a CSO", which is not something that can be declared done by passing a test. The hand-off needs a permission model that does not exist yet, and permission bugs in a clinical safety tool are not acceptable defects.

The orthodox sequence - storage architecture, then project creation, then documents and PDF, then hand-off, then AI - front-loads the parts that everything else depends on and leaves AI last, where it can be scaled down to a prompt and a text box without breaking the rest. The PDF (6) should be proved early on a hand-written example file, because it is the deliverable the sponsor will judge the work by, and discovering a problem with it in December would be expensive.
