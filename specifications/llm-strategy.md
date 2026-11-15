# AI inference connections and settings strategy

<!-- cspell:ignore PKCE -->

**Status: planned, not implemented.** AI is outside the current Quill workflow port. This strategy records the access direction agreed on 15 November 2026 and replaces the former personal-profile-only BYOK assumption and claims that an embedded fine-tuned model already exists. It does not promise clinical accuracy, regulatory acceptance or a new funded delivery date. See [ADR 0007](adr/0007-user-and-organisation-supplied-inference.md), [the roadmap](roadmap.md#ai-access) and [SAFETY.md](../SAFETY.md).

## Purpose and boundaries

Users or the owning organisation supply the inference service and its permitted allowance: an API account/key, a supported account/subscription integration or their own local/on-premises runtime. Turva supplies the reviewed connection and clinical-safety workflow, not an implicit model subscription. Turva-funded/hosted inference is a separate future proposal, never an automatic fallback.

Provider and model support must be extensible. No vendor or local model is excluded merely because it is absent from an initial menu, but adding an endpoint or model name does not prove compatibility, permission, privacy or clinical suitability. Unsupported interfaces/capabilities must be reported explicitly.

AI may help draft narrative, suggest hazards or mitigations, explain criteria and challenge reasoning. It cannot replace a CSO, accept an assessment, confer competence or claim that a system is safe. Derived risk remains the canonical server calculation from human-confirmed severity and likelihood, never a model-entered level.

**AI use is optional and user-driven.** Reading, authoring, reviewing, saving and exporting must remain usable without AI, provider credentials or model availability. A configured personal or organisation connection is permission to offer assistance, not consent to invoke it automatically. No inference starts on page load, typing, blur, save or an unattended background trigger; each generation or regeneration needs an explicit user action. An unavailable or declined AI feature must not block ordinary editing or saving.

## Connection scopes and settings

An inference connection is operational configuration, not clinical evidence and not a new grant to a safety file. Settings must distinguish:

| Context                   | Required behaviour                                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal profile          | A user can connect and manage their own permitted provider account/key. It is not automatically shared with colleagues or required when an authorised organisation connection is available.                                                    |
| Owning organisation       | Authorised settings managers configure organisation-supplied connections and eligible users. Managing credentials/billing does not permit reading or editing private safety evidence.                                                          |
| Organisation unit or team | Support explicit delegated availability at these levels when their identity/grant model is implemented. Separate federation/practice organisations do not inherit connections or evidence rights from names, ancestry or membership elsewhere. |
| Safety file/project       | Allow a narrower connection/model binding or default within the owning organisation's policy. Binding selects an eligible connection; it does not copy a key into the safety repository or grant access.                                       |

Keep credential ownership, billing responsibility, who may configure a connection and who may use it as separate concepts. A personal OAuth account, an organisation API billing account and an organisation-managed local endpoint need not have the same authentication or charging model.

Settings need the following groups, not a single universal API-key field:

- **Ownership and authority:** stable owner/scope identity, current manage/use grants, delegated unit/team or file bindings, and revocation status.
- **Provider and location:** adapter, endpoint, deployment/region and provider-specific API settings; make the actual execution location visible.
- **Authentication and lifecycle:** supported method, protected secret reference or authorised account connection, provider-issued scopes, expiry/refresh/disconnection state and provider-specific client registration where needed.
- **Models and capabilities:** discovered or explicitly entered model/deployment identifiers, available revisions, task capabilities and context/output limits. Report unknown metadata as unknown, not as a fabricated default.
- **Policy and cost:** permitted providers/models/endpoints/data classes, data residency/retention requirements, allowed personal overrides, defaults, spending/rate/token limits and the billed owner. Distinguish estimated, actual and unknown cost.
- **Operational status:** explicit connection test with non-sensitive input, last result, redacted failures and attributable settings changes. Show configured/expired/disconnected status, never an existing secret value.

Organisation policy is the ceiling for organisational evidence, including when a personal connection is selected. Resolve an eligible explicit selection or a permitted, visibly identified default in the current user/file context. If none is valid, stop and explain the missing configuration; do not search other users' keys or silently fall back across owner, organisation, provider, endpoint or model. The precedence and override rules need an explicit implementation contract and tests in R160.

Recheck live evidence access, connection-use grants and policy before dispatch and before retaining a result as evidence. Membership removal, credential revocation or a policy change must block subsequent use. Any future hierarchy/delegation must define revocation/rejoining behaviour explicitly, not restore permissions from a copied safety repository.

## Authentication and subscriptions

Provider authentication is separate from Turva login. Django sessions and CSRF remain the application authentication contract; adding provider OAuth does not replace it with JWT login.

- **API keys:** support the provider's documented key mechanism with write-only entry, validation and secure replacement/removal.
- **OAuth:** offer only provider-supported third-party flows and scopes. Follow [OAuth security best current practice, RFC 9700](https://www.rfc-editor.org/info/rfc9700) and [PKCE, RFC 7636](https://www.rfc-editor.org/info/rfc7636). Bind the authorisation transaction to the initiating Turva user, connection owner and provider; validate issuer/redirects and one-time state, use PKCE for supported authorisation-code flows, and protect access/refresh tokens through refresh, rotation, expiry and revocation. Do not use password collection or implicit-token flows.
- **Cloud/service credentials:** allow provider-supported workload or service authentication through a reviewed adapter, with minimal permissions and an identified owner; do not force every provider into an API-key field.
- **Subscriptions:** a subscription is an entitlement/billing relationship, not itself an authentication protocol. Only connect it where the provider officially permits third-party API use through a supported integration. A consumer chat subscription is not automatically an API licence. Never request a consumer password or reuse unsupported browser/CLI session tokens to imitate an API.
- **Local endpoints:** support the actual reviewed authentication policy, including a no-secret mode only for an explicitly approved isolated endpoint; local does not automatically mean trusted or publicly accessible.

Check the provider's current official documentation and terms before implementing or recommending any adapter or subscription/OAuth option. Do not advertise an unsupported login method just because another provider offers it.

## Credentials and operational storage

Store keys, client secrets and access/refresh tokens encrypted in a protected server-side secret store or equivalent reviewed encrypted operational storage, with appropriate backup and encryption-key management. Never put them into safety-file Git repositories, browser persistent storage, ordinary API responses, prompts, logs, analytics, issue fixtures or document exports. A connection's public identifier is not permission to retrieve its secret.

Implement least-privilege management/use checks, expiry, key/token rotation, disconnection, provider-side revocation where supported and visible failures. Record attributable non-secret configuration/usage events without logging authentication headers or credential-bearing URLs. Do not show stored secrets back to settings managers as a convenience.

This operational secret/configuration storage is not an exception allowing clinical evidence to live only in SQL. Accepted safety content and retained AI review provenance belong in the safety repository, attributed to the acting person. Record only the non-secret connection/provider/model references required for traceability.

## Provider and model interoperability

Use a capability-based adapter contract: configuration validation, supported authentication, non-sensitive connection testing, model/capability discovery where available, invocation and normalised error/usage reporting. Support native provider APIs as well as compatible gateways; an OpenAI-compatible transport is useful, not a universal protocol requirement.

Allow explicit model/deployment IDs for providers without discovery, subject to policy and compatibility checks. Declare task capabilities such as text generation, structured output, images or tool interfaces where relevant; a familiar model name is not evidence that a capability exists. Unsupported tasks fail visibly rather than being silently degraded or routed elsewhere. Model tool support does not authorise autonomous side effects or new evidence access.

Apply request/context/output bounds, timeouts, cancellation and provider-aware retry/idempotency rules. Report incomplete or interrupted output as incomplete and preserve the user's draft; do not imply an uncertain retry cannot cause another charge. Provider failures must not trigger another account, model or destination automatically.

## Local and organisation-hosted inference

Support user-/organisation-operated runtimes through reviewed adapters and network paths. Settings must say whether inference runs on the Turva deployment host, an organisation network host or an individual device, and what hardware/model it requires. An endpoint at `localhost` on a hosted Django server is not the user's laptop.

User-device inference needs a separately reviewed local connector or supported browser/device runtime; do not assume the cloud deployment can reach it or solve reachability by exposing a local service publicly. Keep model-download/setup traffic distinguishable from transmission of safety-file content.

Custom endpoint support requires server-side request-forgery protection, controlled destinations/redirects, appropriate transport security, authentication and explicit approval for local/private-network targets. Do not indiscriminately block all organisation-hosted endpoints or allow arbitrary internal/metadata-service access. Validate the actual data path and failure states; never silently move local work to a cloud provider.

## Privacy and confidentiality

Turva does not process patient data. Adding an AI connection does not permit patient data in prompts, fixtures or safety files.

Before a request, show the effective connection owner, billing context, provider/endpoint location, model and the information selected for transmission. Minimise the payload and require an explicit user action under the owning organisation's permitted data-handling terms. File visibility or possession of a key is not consent to send an entire file, another organisation's evidence or unrelated account information.

No private safety content is training data by default. Public visibility is not permission for training either: any future data contribution/fine-tuning scheme needs its own consent, licensing, retention and withdrawal design. Do not promise that already trained weights can simply have a contribution removed. Provider retention, residency and training behaviour must be checked against actual configuration and contracts, not inferred from a model's name or a local/cloud label.

Local/on-device inference must keep safety content within the declared boundary, without hidden cloud routing or telemetry. Test that property; running a model locally does not by itself establish it. Caches and retained outputs remain scoped to authorised users/files and need the same disclosure and retention controls.

## Optional inline wording assistance

R163 defines a shared field/editor interaction, not a mandatory chatbot or a replacement for ordinary text entry. Beside an eligible narrative text box, offer an explicit **AI** button with a field-specific accessible name such as "Suggest wording for mitigation rationale". Keep the control secondary to writing and saving; explain unavailable assistance without forcing a provider setup step to continue manual work.

The interaction must provide:

- **Deliberate request:** the user asks for alternative wording for the selected field or passage. Show the effective provider/model, destination, billed owner and exact input before dispatch. Send only that text and the minimal authorised context the user has selected; do not silently include the whole form, safety file or attachments. Connection setup and destination disclosure can precede the request when needed; merely opening settings or a preview is not consent to generate.
- **Review in context:** show the proposed wording inline or immediately alongside the field without replacing its current draft on arrival. Retain the exact original and display a faithful diff: removals in red, additions in green, with explicit "Removed"/"Added" labels and deletion/insertion styling that remains understandable without colour. Provide keyboard and screen-reader access, readable contrast, high-contrast and narrow-screen layouts. Edit colours mean changed wording, not risk level, correctness or clinical approval.
- **User-controlled application:** offer **Accept suggestion**, **Reject**, editing of the proposal and **Undo** before saving. Recompute the comparison after proposal edits. Acceptance updates only the unsaved draft; rejection/cancellation leaves the current draft intact, and undo must not discard unrelated later edits. Retain the original for comparison while reviewing. A separate explicit whole-form/document **Save** is still required; AI request, arrival and acceptance create no evidence commit. Diff markup is review UI, not text to store in the safety document. After a save, corrections create a new attributable commit, never a history rewrite.
- **Preserving content:** a wording request must ask to preserve clinical meaning, uncertainty, quantities and citations, but that instruction is not evidence that a model did so. Make changed negation, numbers, references and structure visible for human review. Preserve unaffected Markdown, links, tables and template comments; use the preserving Markdown-source fallback for unsupported constructs instead of flattening or dropping them. Render proposed content safely as untrusted input, never executable model HTML. Wording assistance cannot change scores, identifiers, statuses, relationships or review/approval decisions through a text-field action.
- **Draft and request identity:** bind each request to its safety file, artefact, field/passage, exact submitted draft revision and the form's opened source commit. Typing while waiting, a newer request, cancellation, navigation or switching resources must prevent an older response being applied. Retain the current draft; mark a superseded proposal stale and require a fresh explicit request or deliberate comparison, never automatic replacement or merging. A remote repository change still causes the existing opened-version save conflict; do not refresh `expected_head` or retry that save automatically. Failure, incomplete output or cancellation must preserve the draft and must not be presented as a completed suggestion. Cancelling the UI cannot promise to recall data already sent or avoid a provider charge.

Accepting improved wording is not clinical verification. The person must check meaning and evidence, and any applicable CSO review remains separate. This workflow refines the human-review requirement below; it is planned behaviour, not an implemented button or diff editor.

## Human review and evidence workflow

1. An authorised person explicitly requests assistance, selects an eligible connection/model for the current safety file and previews the intended input and destination.
2. The service rechecks file and connection authority, retains the form's opened source version and exact submitted draft revision, and invokes the provider within policy/resource limits. It must not substitute the latest repository version for the one the person opened.
3. The result is displayed as untrusted AI assistance, separate from accepted CSO reasoning; source-document instructions and model tool suggestions cannot bypass authority or trigger privileged actions.
4. The person compares, reviews, edits, accepts or rejects the proposal; applying it changes an unsaved draft only. Risk suggestions never set a risk level directly or stand in for the CSO's confirmation of valid severity/likelihood.
5. An explicit whole-form/document save uses the opened version and the existing services. Accepted content and AI-review provenance are committed under the acting user's identity, not the model or a shared provider account. Record available provider/model identity/revision, source commit and review decision without credentials; make mutable/unknown model revisions visible. Retain stale drafts rather than refreshing the version and retrying the clinical save automatically.

An AI draft is not a safety case, an effectiveness finding, clinical sign-off or regulatory acceptance. A fine-tuned model or a second model judging the first does not remove independent human review.

## Model recommendations

Maintain an optional, versioned recommendation catalogue for specific tasks, not a fixed provider whitelist or a claim that a model is clinically approved. Record evaluation date, exact available model/version or alias uncertainty, fictional/public test material, results and limitations, supported capabilities/context, cost/latency, provider data terms, licence and local hardware requirements.

Allow policy-compliant custom choices beyond that catalogue. Re-evaluate changed/retired models and provider terms, and never silently substitute the current recommendation for the user's selected model. General generation, extraction assistance and critique need separate evaluations; fluency or benchmark scores alone do not establish safety-case quality.

## Delivery and acceptance

Existing roadmap codes remain: R113 personal connections, R114 visible data flow, R115 provenance/human review, R116 external-client access and R117 separately scoped Turva-hosted inference. R155-R162 cover scoped settings, authentication/subscriptions, credential lifecycle, adapters, local inference, routing/policy, recommendations and conformance/safety acceptance. R163 covers optional inline wording assistance and accessible change review.

Before enabling a slice, test applicable combinations with fictional data and controlled provider stubs, not real customer documents or production credentials:

- Personal versus organisation/unit/team/file scope, separate manage/use/evidence permissions, policy-constrained personal choices and revocation during a request.
- Key replacement/removal, encryption/redaction, OAuth callback binding, expired/rotated refresh tokens and safe disconnection. Protect all settings mutations with the existing session/CSRF boundary.
- Native/compatible/custom/local adapters, undiscovered models, denied destinations/redirects and unsupported capabilities.
- Quotas, allowance expiry, timeouts, cancellation, partial output, uncertain retries and refusal to switch billing/destination silently.
- Ordinary reading/editing/saving/exporting with AI declined, not configured, disabled or unavailable; no automatic inference on load, typing, blur or save, including with an organisation connection configured. Assert no provider request until an explicit AI action and no evidence write until a separate Save.
- Exact original/proposal comparisons, accept/reject/edit/undo, retained drafts and safe rendering. Fictional fixtures must expose changed negation, punctuation, quantities, citations, links, tables, template comments and unsupported Markdown, not just unchanged words or a plausible-looking preview.
- Out-of-order responses, user edits during inference, cancellation, navigation, resource changes, revocation and intervening repository commits. Neither suggestion application nor save may silently replace a newer draft or substitute a fresh source version.
- Prompt/content injection, fabricated references, attempted direct risk-level writes, accepted-content provenance, failed Git writes and retained stale drafts.
- Settings and review screens on phone/tablet/desktop, including keyboard, screen-reader, zoom, high-contrast/colour-independent diff cues and clear failure states.

Update the relevant hazards and obtain the independent clinical/security review appropriate to the capability. Passing these tests is evidence of implementation behaviour, not closure of TH-002, TH-004, TH-005, TH-006 or TH-008 and not a claim of clinical or regulatory approval.
