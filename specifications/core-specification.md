# Turva: Core Specification

## What Turva Is

Turva is a platform for managing clinical safety evidence for healthcare IT systems. It provides structured, auditable, and collaborative management of hazards, risk assessments, and safety cases throughout a system's lifecycle.

### Core Problem

Healthcare IT can harm patients. Changes introduce new risks. Traditional clinical risk management uses spreadsheets, Word documents, and email, which lack audit trails, version control, and effective collaboration.

### Core Solution

Turva treats clinical safety as structured data with complete version history, enabling:

- Systematic hazard identification and tracking
- Rigorous risk assessment with derived (not arbitrary) risk levels
- Transparent decision-making with named accountability
- Federation of safety knowledge between organizations
- AI-assisted safety case generation and review
- Complete regulatory compliance evidence (DCB0129/DCB0160)

## Who It's For

- **Clinical Safety Officers**: Lead safety assessment and approval
- **Development Teams**: Identify and mitigate hazards during development
- **Healthcare Organizations**: Deploy systems safely with local context
- **Regulators and Auditors**: Review compliance and decision-making
- **The Safety Community**: Share knowledge and reuse safety cases

## Domain Model

### Project

A healthcare IT system undergoing clinical safety assessment. Each project has:

- Unique identifier
- Owner (typically the Clinical Safety Officer)
- Visibility (public for transparency, or private where justified)
- Associated hazards, assessments, and safety cases

### Hazard

A potential source of harm. Never deleted, only closed with justification. Includes:

- Unique identifier and description
- Cause, effect on care pathway, and potential harm
- Assignment to a responsible individual
- Status (open/closed/transferred)
- Links to risk assessments and mitigations

### Risk Assessment

Evaluation of a hazard's severity and likelihood. Exists at two points:

- **Initial**: Before new mitigations are applied
- **Residual**: After mitigations are implemented

#### Severity (Impact)

1. Minor - negligible consequence
2. Significant - minor injury with long-term effects
3. Considerable - severe injury with expected recovery
4. Major - one death or life-changing incapacity
5. Catastrophic - multiple deaths or severe injuries

#### Likelihood (Probability)

1. Very low - nearly negligible possibility
2. Low - could occur but usually will not
3. Medium - may occur occasionally
4. High - expected to occur in majority of cases
5. Very high - certain or almost certain

#### Risk Level (Derived from Severity × Likelihood)

1. Acceptable - no further action required
2. Acceptable if cost of reduction exceeds benefit
3. Undesirable - attempts should be made to eliminate
4. Mandatory elimination - must reduce before deployment
5. Unacceptable - cannot proceed until reduced

**Critical principle**: Risk level is calculated automatically from severity and likelihood. Users cannot arbitrarily assign risk levels that contradict their assessments. This ensures consistency and prevents subjective downgrading of serious risks.

### Mitigation

A control measure reducing likelihood or severity of harm. Includes:

- Description of the control
- Evidence of implementation
- Justification for effectiveness
- Links to affected hazards

Hierarchy of controls (strongest to weakest):
1. Eliminate the hazard through design
2. Reduce via technical controls
3. Warnings or alerts
4. Training or procedures

### Safety Case

A structured argument, supported by evidence, that a system is acceptably safe for intended use. Comprises:

- System identification and intended use
- Clinical context
- Complete hazard log with assessments
- Mitigations and evidence
- Justification for accepting residual risks
- Governance and responsible personnel

### Organization

The legal entity responsible for a system (manufacturer or deployer). Has:

- Named Clinical Safety Officer
- Defined governance structures
- Clinical risk management system
- Ownership of projects

### Clinical Safety Officer

A registered healthcare professional responsible for ensuring system safety through clinical risk management. Must have:

- Current professional registration
- Training in clinical risk management
- Organizational independence from development/delivery pressures
- Authority to influence or halt deployment

## Core Principles

### Safety Decisions Are Time-Bound

A safety decision is valid only for the system state in which it was made. When the system changes, previous assessments may be invalid. This requires:

- Immutable historical records
- Change tracking linked to affected hazards
- Re-assessment triggers on modification
- Version control as a safety capability, not administrative convenience

### Auditability by Default

Every safety decision must be traceable to:

- The individual who made it
- When it was made
- The rationale and evidence
- The system state at that time

### Collaborative Contribution with Explicit Accountability

Multiple people contribute (developers, clinicians, reviewers), but accountability is always explicit:

- Contributors provide input; approvers accept accountability
- Every artefact has a named owner at all times
- Delegation is documented and traceable
- Contribution is not approval

### Transparency as Default

Projects are public by default to enable external scrutiny, learning, and accountability. Private projects are supported where justified (commercial sensitivity, security) but visibility is a deliberate governance decision.

### Federation of Safety Knowledge

Organizations can share and reuse safety cases:

- **Upstream**: Smaller organizations inherit manufacturer safety cases
- **Downstream**: Manufacturers publish safety cases for deployers
- **Lateral**: Organizations learn from each other's hazard logs
- **Community**: Public projects contribute to collective safety knowledge

This reduces duplication, improves quality, and accelerates safe deployment.

## AI and LLM Integration

### The LLM Opportunity

Modern LLMs can draft clinical safety cases in minutes, potentially making traditional templating engines obsolete. Turva embraces this by:

- **Embedded safety expert LLM**: AI assistant helps CSOs identify hazards, assess risks, and draft mitigations
- **Safety case generation**: LLM drafts complete safety cases from structured data
- **Review and critique**: AI challenges assessments and suggests missed hazards
- **Evidence synthesis**: Automatically links supporting evidence to claims

### What LLMs Can't Replace

Turva's core value beyond LLM capabilities:

1. **Structured data model**: Ensures consistency, enables filtering/sorting, enforces derived risk levels
2. **Immutable audit trails**: Version control provides regulatory-grade evidence that LLM outputs lack
3. **Multi-stakeholder collaboration**: Named accountability, approval workflows, and governance
4. **Federation**: Sharing and reusing safety knowledge across organizations
5. **Regulatory compliance**: Automated evidence generation for DCB0129/DCB0160
6. **Human accountability**: A CSO's signature and registration number, not an AI's output

### LLM as Augmentation, Not Replacement

LLMs generate content; Turva provides structure, governance, and evidence. The combination enables CSOs to work faster while maintaining rigorous standards.

## Regulatory Alignment

Turva supports NHS England DCB0129 (manufacture) and DCB0160 (deployment) by managing:

- Clinical risk management plans
- Hazard logs with complete history
- Risk assessments and justifications
- Safety case reports
- Evidence of mitigation effectiveness
- Audit trails of all decisions

The platform generates compliance evidence automatically from structured data.

## Non-Goals

Turva is not:

- A real-time patient safety monitoring system
- A replacement for clinical competence or professional judgment
- A guarantee of safety (it supports the process, residual risks remain)
- A general project management tool
- A clinical decision support system

## Extensibility

The domain model supports new safety artefact types as clinical safety practice evolves:

- Incident reports
- Compliance sign-offs
- Third-party assessments
- Supplier evaluations

New types inherit core properties: versioning, audit trails, ownership, governance.

## Key Differentiators

What makes Turva different from "just use Claude to write a safety case":

1. **Structured risk assessment**: Enforced severity/likelihood matrix with derived risk levels
2. **Complete audit trail**: Every decision is attributed, timestamped, and immutable
3. **Multi-project federation**: Share and reuse safety knowledge
4. **Collaborative governance**: Multiple contributors, explicit accountability
5. **Regulatory compliance**: Automated evidence generation
6. **LLM-augmented**: AI assists CSOs, doesn't replace them

---

This specification defines what Turva does and why, independent of implementation. See `llm-strategy.md` for details on AI integration and `federation.md` for cross-organizational collaboration.
