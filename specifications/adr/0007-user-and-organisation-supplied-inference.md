# ADR 0007: User- and organisation-supplied inference connections

- **Status**: Accepted direction; implementation not started
- **Date**: 2026-11-15
- **Decision-maker**: Marcus Baw
- **Supersedes**: the personal-profile-only BYOK restriction in the AI access plans, not the deferral of AI from the current workflow port
- **Related**: [ADR 0006](0006-named-file-teams-and-live-appointments.md), [AI strategy](../llm-strategy.md), [roadmap AI access](../roadmap.md#ai-access)

## Context

Inference may be paid for and authorised by an individual, an owning organisation or an explicitly delegated organisational unit/team. Providers differ in their APIs, authentication, subscription entitlements and available models; some users and organisations operate their own inference hardware. A single personal API-key field or fixed vendor/model list would exclude these legitimate arrangements.

Organisation and evidence authority are already separate. Connecting an organisation's model must not give its administrators access to safety evidence or let a personal connection bypass that organisation's data-handling policy.

## Decision

- Represent inference as an explicitly owned, scoped connection with provider/endpoint configuration, supported authentication, a protected credential reference, use/management permissions, model choices and policy/billing context. Personal and organisation ownership are first-class; unit/team delegation and file-specific bindings require explicit identities and grants, not free-text names or inferred ancestry.
- Keep provider integration extensible through native API adapters, compatible gateways and local/custom endpoints. Potential support is open-ended, not a claim that every provider or model already works. Capability and policy checks decide whether an actual connection can perform a requested task.
- Accept keys, provider-authorised OAuth and other supported provider credentials. A subscription can fund inference only where the provider offers a documented, permitted third-party API integration; do not repurpose consumer passwords or unsupported chat-session tokens.
- Separate connection configuration, credential use, billing responsibility and evidence authority. Recheck current file access and connection-use permission before dispatch; organisation policy constrains personal overrides. No implicit parent-to-child organisation grants and no silent fallback to a different connection, owner, provider or model.
- Keep credentials encrypted in protected operational storage, outside safety repositories, with redacted settings, revocation/rotation and attributable non-secret management events. Safety content and retained AI review provenance remain in Git, attributed to the acting person.
- Keep AI output an untrusted proposal. Human review, opened-version saves, canonical risk derivation and controlled exports remain mandatory. Models do not approve safety cases or write clinical decisions autonomously.

## Consequences and limits

Settings must support more than a key field on the user profile. [The AI strategy](../llm-strategy.md) defines the required scope, authentication, endpoint, model, selection and credential-lifecycle behaviour; R155-R162 make these separately referenceable delivery items while retaining R113-R117.

This is a planning decision, not shipped credential storage, OAuth, inference or a clinical acceptance decision. It neither changes the current port's scope nor enables Turva-hosted inference. The no-patient-data rule, existing session/CSRF authentication and [SAFETY.md](../../SAFETY.md) gates remain unchanged. Provider-specific support and any future organisational hierarchy require reviewed implementations and conformance tests before use.

## Review triggers

Revisit when selecting the initial adapters/authentication flows, defining unit/team delegation, introducing user-device connectivity, changing provider data-handling terms, adding model tools/actions, or proposing a Turva-funded inference service.
