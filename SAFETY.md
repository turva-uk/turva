# Clinical Safety

Turva is a tool for managing clinical safety evidence. That makes its own safety profile unusual: it never touches a patient, but a defect in it can cause an unsafe system to be deployed in the belief that it is safe. This file is the entry point for Turva's own clinical safety considerations.

This is a governance record maintained alongside the code. It is not a completed safety case, and it is not regulatory advice.

## What Turva does

- Stores, versions and structures clinical safety evidence: hazards, risk assessments, mitigations, and safety cases
- Enforces that risk level is derived from severity and likelihood rather than chosen
- Keeps an attributable, timestamped audit trail in Git
- Generates a safety case document (PDF) from that evidence
- Offers AI assistance to help a Clinical Safety Officer draft and review safety content

## What Turva does not do

- It does not make clinical decisions and is not clinical decision support
- It does not monitor patients or process patient data
- It does not replace a Clinical Safety Officer, clinical competence, or professional judgement
- It does not certify that a system is safe. It helps a CSO construct and evidence that argument; the accountability remains the CSO's
- It does not guarantee regulatory compliance. It supports DCB0129 and DCB0160 processes

## Intended users and environment

Clinical Safety Officers and the development and deployment teams they work with, in NHS and NHS-adjacent organisations. Used in an office or remote-working setting on a general-purpose computer. Not used at the point of care, and not in a time-critical context.

## Safety owner

|                           |                                                                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clinical safety owner** | _To be named._ The phase-one sponsor acts as SRO and is a practising Clinical Safety Officer; whether they also hold clinical safety accountability for Turva itself needs to be stated explicitly rather than assumed. |
| **Technical owner**       | Marcus Baw                                                                                                                                                                                                              |

Leaving this unnamed is itself a known gap. A clinical safety tool with no named safety owner is not a position to hold at release.

## Current safety status

**Pre-release. Not for use on a real safety case that an organisation will rely on.**

Phase one is in development against [specifications/phase-one-scope.md](specifications/phase-one-scope.md). The hazards below are an initial draft prepared during development, structured for review. **They have not been assessed or accepted by a Clinical Safety Officer.** Severity and likelihood values are proposals to start a conversation, not findings.

Turva's own assessment should be carried out in Turva once it can hold one. Until then it lives here.

## Draft hazard log

Scales as defined in [specifications/core-specification.md](specifications/core-specification.md). Risk level is derived, never chosen.

| ID     | Hazard                                                 | Cause                                                                                | Clinical consequence                                                                         | Proposed S | Proposed L | Status |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------- | ---------- | ------ |
| TH-001 | An incomplete safety case is presented as complete     | Guided workflow marks a file finished without all required evidence present          | Organisation deploys a system believing its risks are assessed when they are not             | 4          | 3          | Open   |
| TH-002 | AI-generated safety content is accepted without review | Plausible, fluent output invites acceptance; no enforced review step before sign-off | Fabricated or inappropriate hazards and mitigations enter a real safety case                 | 4          | 4          | Open   |
| TH-003 | Safety evidence is lost or corrupted                   | Repository deleted, disk failure, or no backup of the Git repositories               | Loss of regulatory evidence; inability to demonstrate historical safety decisions            | 3          | 3          | Open   |
| TH-004 | The audit trail is not trustworthy                     | Commits attributed to the wrong user, or history rewritten                           | Safety decisions cannot be reliably attributed; evidence fails audit or legal challenge      | 4          | 2          | Open   |
| TH-005 | Unauthorised access to a safety file                   | Authentication or authorisation defect                                               | Disclosure of commercially or security-sensitive hazard information                          | 2          | 3          | Open   |
| TH-006 | Customer hand-off grants more access than intended     | Phase-one hand-off permission model is new and not yet built                         | A third party reads or alters safety content they should not                                 | 3          | 3          | Open   |
| TH-007 | A generated PDF does not match the evidence it cites   | PDF built from a different state than the commit it references                       | A document is relied on as the safety case while the underlying evidence says something else | 4          | 2          | Open   |
| TH-008 | Derived risk level is calculated incorrectly           | Defect in the severity/likelihood matrix                                             | Serious risks presented as acceptable                                                        | 5          | 1          | Open   |

TH-002 and TH-008 are the two that most directly undermine the product's purpose. TH-008 is the reason the risk matrix needs complete test coverage, as [specifications/architecture-principles.md](specifications/architecture-principles.md) already requires.

## Medical-device applicability

Required at inception as a governance record. **This record is incomplete and must be completed and dated by a named person before release.** A draft position is offered to start from; it is not a conclusion.

- **Intended purpose**: Management of clinical risk documentation and evidence by Clinical Safety Officers and development teams. No diagnosis, treatment, prevention, monitoring or prognosis of disease. No patient-specific output. No clinical claims about individual patients.
- **Decision-maker and role**: _To be completed._
- **Decision date**: _To be completed._
- **Next review date**: _To be completed._
- **Evidence considered**: _To be completed, with access dates._ Review MHRA guidance on [borderline products](https://www.gov.uk/guidance/borderline-products-how-to-tell-if-your-product-is-a-medical-device) and [regulating medical devices in the UK](https://www.gov.uk/guidance/regulating-medical-devices-in-the-uk), and NHS England guidance on [DCB0129 and DCB0160 applicability](https://digital.nhs.uk/services/clinical-safety/applicability-of-dcb-0129-and-dcb-0160/step-by-step-guidance).
- **Draft conclusion, for confirmation**: Turva appears not to meet the definition of a medical device, because it has no intended medical purpose in relation to an individual patient and produces no patient-specific output. It is a quality and documentation management tool supporting a clinical safety process.
- **Actions and owner**: _To be completed._ At minimum: name a clinical safety owner, confirm the conclusion, and set a review date.
- **Reassessment triggers**: Any change to intended purpose or clinical claims; introduction of patient-specific or patient-identifiable data; introduction of anything that could function as clinical decision support, including AI output that advises on individual patient care; integration with a medical device; change of target users or market.

Note that a conclusion of "not a medical device" would not remove the need to manage the hazards above. The two questions are separate.

## Keeping safety and implementation linked

When a change affects clinical behaviour - the risk matrix, the audit trail, permissions, document generation, or AI-generated safety content - update this file in the same commit, or state why no change is needed. Tests covering safety-relevant behaviour should name the hazard they protect against.

## Related documents

- [specifications/phase-one-scope.md](specifications/phase-one-scope.md) - what is being built now
- [specifications/core-specification.md](specifications/core-specification.md) - domain model and risk scales
- [specifications/architecture-principles.md](specifications/architecture-principles.md) - Git as the system of record, and the audit trail it provides
- [SECURITY.md](SECURITY.md) - vulnerability reporting
