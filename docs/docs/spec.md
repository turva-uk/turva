# Turva: Clinical Safety Management Platform Specification

## Introduction

This specification describes the domain model, workflows, and principles underpinning Turva, a clinical safety management platform. Turva is a continuation and evolution of the Digital Clinical Safety Platform, carrying forward its essential concepts while providing a foundation for future development.

This document is intended for clinicians, engineers, safety officers, regulators, and other stakeholders involved in the design, development, deployment, and assurance of healthcare information technology systems. It describes what the system does, why it exists, and how it supports safe deployment of clinical systems, without prescribing implementation details.

## Purpose and Scope

### What Turva Exists to Solve

Healthcare information technology systems, by their nature, can introduce clinical risk. Changes to clinical workflows, system failures, data errors, and user interface issues can all lead to patient harm. Traditional clinical risk management approaches, often based on spreadsheets and static documents, are poorly suited to modern software development practices.

Turva exists to enable systematic, transparent, and auditable management of clinical safety throughout the lifecycle of healthcare IT systems. It treats clinical safety as a continuous process, not a one-off compliance exercise.

### What Turva Does

Turva provides a structured environment for:

- Identifying hazards associated with healthcare IT systems
- Assessing the severity and likelihood of potential harms
- Recording mitigations and controls
- Tracking residual risk after mitigations
- Maintaining complete audit trails of safety decisions
- Generating evidence for regulatory compliance
- Supporting transparency and openness in safety management

The system manages structured information about hazards, risks, and safety cases, enabling clinical safety officers and development teams to work together effectively.

### What Turva Does Not Do

Turva is not:

- A replacement for clinical judgement or professional responsibility
- A real-time patient safety system
- A tool for direct patient care
- A guarantee of safety (it supports the safety process, but cannot eliminate all risk)
- A substitute for proper clinical safety governance and competent personnel

The system manages safety evidence and workflows, but the substantive safety decisions remain the responsibility of appropriately qualified and registered clinical professionals.

### Who Turva Is For

The system serves multiple roles within clinical safety governance:

- **Clinical Safety Officers**: Accountable for the safety of healthcare IT systems, responsible for establishing and maintaining the clinical risk management system
- **Development Teams**: Engineers, designers, and technical staff who build and maintain healthcare IT systems
- **Clinical Reviewers**: Healthcare professionals who assess hazards and provide clinical input to risk assessments
- **Quality and Governance Staff**: Those responsible for assurance, audit, and regulatory compliance
- **Senior Responsible Officers**: Executives with ultimate accountability for deployed systems
- **External Auditors and Regulators**: Those who review and assess compliance with clinical safety standards

## Core Concepts

### Project

A project represents a single healthcare IT system or service undergoing clinical safety assessment. Each project has its own safety documentation, hazard log, and audit trail.

A project exists because each healthcare IT system requires separate clinical risk management. A project may represent:

- A new system being developed
- An existing system undergoing significant change
- A deployed system requiring ongoing safety monitoring
- A service composed of multiple technical components

Projects are owned by a named individual (typically the Clinical Safety Officer or a senior clinician) and may have multiple team members with different permissions.

Projects relate to organisations (the entity responsible for the system), users (people involved in safety management), and hazards (the risks being managed).

### Hazard

A hazard is a potential source of harm. It describes a circumstance in which something could go wrong, independent of whether harm actually occurs.

Hazards exist as discrete, traceable entities because each potential source of harm requires individual assessment, mitigation, and monitoring. Spreadsheet-based hazard logs conflate discussion, evidence, and risk scoring in ways that obscure decision-making and make audit trails unreliable.

A hazard includes:

- A unique identifier
- A descriptive name
- Categorisation by type (for example, wrong patient, wrong drug, delayed treatment)
- The cause or causes that give rise to the hazard
- The effect on the care pathway
- The potential harm that could result
- Severity and likelihood scores
- A calculated risk level
- Existing controls that partially mitigate the hazard
- Assignment to a responsible individual
- Status (open, closed, or transferred)

Hazards are never deleted. If a hazard is no longer relevant, it is closed with justification. This preserves the safety record and demonstrates that risks were considered.

Hazards relate to projects, mitigations, risk assessments, and decision provenance.

### Risk Assessment

A risk assessment is the evaluation of a hazard to determine its severity and likelihood. It produces a risk level that guides the need for mitigation.

Risk assessments exist at two points in a hazard's lifecycle:

- **Initial Risk Assessment**: Evaluates the hazard in its current state, before new mitigations are applied
- **Residual Risk Assessment**: Re-evaluates the hazard after mitigations are in place

The distinction exists because clinical risk management requires demonstrating that risks have been reduced to acceptable levels through design, process, or controls.

Risk assessment uses a severity-likelihood matrix:

**Severity** (impact on patients):

1. Minor: Minor injury or short-term recovery; negligible consequence
2. Significant: Minor injury with long-term effects; significant psychological trauma affecting one person
3. Considerable: Severe injury with expected recovery; significant psychological trauma affecting multiple people
4. Major: One death; severe injury or life-changing incapacity affecting one person
5. Catastrophic: Multiple deaths or severe injuries

**Likelihood** (probability of occurrence):

1. Very low: Negligible or nearly negligible possibility
2. Low: Could occur but usually will not
3. Medium: Possible; may occur occasionally
4. High: Reasonably expected to occur in the majority of cases
5. Very high: Certain or almost certain

**Risk Level** (combination of severity and likelihood):

1. Acceptable: No further action required
2. Acceptable if cost of reduction exceeds benefit: Tolerable with justification
3. Undesirable: Attempts should be made to eliminate or control
4. Mandatory risk elimination: Must reduce to acceptable level
5. Unacceptable: Cannot proceed until risk is reduced

Risk assessments relate to hazards, mitigations, and the broader safety case.

### Mitigation

A mitigation is a control measure introduced to reduce the likelihood or severity of harm arising from a hazard.

Mitigations exist as a distinct concept because demonstrating safety requires showing what actions were taken, not just asserting that risk is acceptable.

Mitigations may include:

- Design changes to the system
- Additional validation or testing
- Warnings or alerts to users
- Training for clinical staff
- Changes to business processes
- Procedural safeguards
- Monitoring or audit mechanisms

Each mitigation is linked to one or more hazards and should include:

- A description of the control measure
- Evidence that it has been implemented
- Justification for why it is effective
- Ownership and responsibility for maintenance

Mitigations relate to hazards, residual risk assessments, and the overall safety argument.

### Safety Case

A safety case is a structured argument, supported by evidence, that a healthcare IT system is acceptably safe for its intended use.

The safety case exists because regulatory standards (such as NHS England DCB0129 and DCB0160) require manufacturers and deployers to demonstrate safety, not merely assert it.

A safety case comprises:

- Identification of the system and its intended use
- Description of the clinical context
- Hazard log with all identified hazards
- Risk assessments (initial and residual)
- Mitigations and controls
- Evidence supporting the effectiveness of mitigations
- Justification for accepting residual risks
- Governance arrangements and responsible personnel

The safety case is not a static document but an evolving body of evidence maintained throughout the system's lifecycle.

Safety cases relate to projects, hazards, risk assessments, mitigations, and the clinical risk management system.

### Clinical Risk Management System

A clinical risk management system is the overarching framework of processes, roles, and responsibilities for managing clinical risk across an organisation.

The system exists because healthcare IT safety requires consistent application of risk management principles, not ad hoc decision-making.

The clinical risk management system includes:

- Policies and procedures for hazard identification and assessment
- Defined roles (Clinical Safety Officer, reviewers, approvers)
- Governance arrangements (who makes decisions and how)
- Training and competency requirements
- Audit and assurance processes
- Incident management procedures
- Supplier management and third-party assessment

Each organisation implementing healthcare IT must establish and maintain its clinical risk management system. Individual projects operate within this system.

The clinical risk management system relates to all projects, personnel, and governance structures.

### Clinical Safety Officer

The Clinical Safety Officer is a named, accountable individual responsible for ensuring the safety of a healthcare IT system through application of clinical risk management.

This role exists because clinical safety requires clinical judgement exercised by a healthcare professional with current registration and appropriate training in risk management.

The Clinical Safety Officer:

- Holds current registration with an appropriate professional body
- Has suitable training in clinical risk management
- Leads hazard identification and risk assessment activities
- Reviews and approves safety documentation
- Provides clinical input to design and development decisions
- Coordinates with other clinical and governance staff
- Maintains the clinical risk management file

The Clinical Safety Officer must be organisationally independent from those developing or implementing the system, to avoid conflicts of interest.

Clinical Safety Officers relate to projects, organisations, and the clinical risk management system.

### Clinical Risk Management File

The clinical risk management file is a controlled repository containing all safety-related information for a healthcare IT system.

The file exists because regulatory standards require traceability, auditability, and completeness of safety records. All evidence supporting safety decisions must be retained and available for review.

The file typically contains:

- Clinical risk management plan
- Hazard log
- Risk assessments
- Safety case reports
- Evidence supporting mitigations
- Meeting minutes and decisions
- Correspondence and approvals
- Audit reports
- Incident reports

In practice, version control systems provide superior capabilities for maintaining this file compared to traditional folder structures, as they provide immutable audit trails and transparent change history.

The clinical risk management file relates to projects, hazards, safety cases, and governance processes.

### Organisation

An organisation is the legal entity responsible for a healthcare IT system. This may be the manufacturer (for systems being built) or the deploying organisation (for systems being used in clinical practice).

Organisations exist as a concept because accountability for safety must be clearly assigned. Regulatory standards distinguish between manufacturer responsibilities (DCB0129) and deployer responsibilities (DCB0160).

An organisation has:

- A named Clinical Safety Officer
- Defined governance structures
- A clinical risk management system
- Ownership of one or more projects

Organisations relate to projects, personnel, and the broader regulatory environment.

### Change

A change is a modification to a healthcare IT system that may affect its safety characteristics. Changes trigger reassessment of existing hazards and identification of new hazards.

Changes exist as a distinct concept because the safety of a system is not static. Each modification introduces potential risk and requires safety evaluation.

Changes may include:

- New features or functionality
- Modifications to existing behaviour
- Updates to third-party components
- Infrastructure changes
- Changes to deployment or configuration

Each change should be linked to affected hazards and should trigger review of the hazard log.

Changes relate to projects, hazards, and the clinical risk management process.

### User Roles and Permissions

Access to safety information is controlled based on user roles and project membership.

Role-based access exists because:

- Some projects contain confidential information
- Different users have different responsibilities
- Audit requirements necessitate tracking who did what

Access levels typically include:

- **Project Owner**: Full control of a project and its safety documentation
- **Project Member**: Ability to view and contribute to a project's hazard log
- **Public Viewer**: Ability to view safety documentation where transparency is appropriate
- **No Access**: Private projects restricted to specific individuals

Roles relate to users, projects, and the broader governance model.

## Clinical Safety Lifecycle

Clinical safety management is a continuous process, not a sequence of discrete phases. The lifecycle described here is circular, with ongoing monitoring and reassessment throughout the system's operational life.

### System Definition

At the outset, the healthcare IT system must be clearly defined:

- What is its intended purpose?
- In what clinical context will it be used?
- Who are the intended users?
- What are the boundaries of the system (what is in scope and what is not)?
- What third-party components or dependencies are involved?

This definition establishes the scope for hazard identification and provides context for risk assessment.

### Hazard Identification

Hazard identification is the systematic process of discovering potential sources of harm.

Hazards may be identified through:

- Structured workshops with clinical and technical staff
- Analysis of similar systems and known failure modes
- Review of incident reports from comparable systems
- Consideration of foreseeable misuse
- Assessment of failure modes in technical components
- Review of changes to the system

Hazard identification is not a one-off activity. New hazards may be discovered at any time during development, deployment, or operation.

Each identified hazard is recorded in the hazard log with sufficient detail to enable assessment.

### Initial Risk Assessment

For each identified hazard, an initial risk assessment determines:

- The severity of potential harm (if the hazard were to result in harm)
- The likelihood of the harm occurring
- The resulting risk level

This assessment considers the system as it is, without assuming that new mitigations will be applied. Existing controls (measures already in place) are taken into account.

The risk level determines the urgency and necessity of mitigation:

- **Unacceptable risk**: System cannot be deployed until risk is reduced
- **Mandatory risk elimination**: Risk must be reduced before deployment
- **Undesirable risk**: Reasonable efforts should be made to reduce risk
- **Acceptable risk**: Risk may be accepted with justification
- **Acceptable risk without further action**: No additional controls needed

### Mitigation Design

For hazards assessed at unacceptable or mandatory risk elimination levels, mitigations must be designed and implemented.

For undesirable risks, mitigations should be considered unless the cost or impracticality outweighs the benefit.

Mitigations are selected based on:

- Effectiveness at reducing likelihood or severity
- Feasibility of implementation
- Impact on system usability
- Cost and resource requirements

The hierarchy of controls is generally preferred:

1. Eliminate the hazard through design
2. Reduce likelihood or severity through technical controls
3. Provide warnings or alerts
4. Rely on training or procedures (least preferred)

Each mitigation is documented with:

- What control is being applied
- How it reduces risk
- Evidence of implementation
- Responsibility for ongoing maintenance

### Residual Risk Assessment

After mitigations are implemented, each hazard is reassessed to determine residual risk.

The residual risk assessment considers:

- Whether the mitigation was effective
- Whether likelihood or severity (or both) were reduced
- Whether the residual risk is now acceptable

If residual risk remains unacceptable, further mitigations are required, or the system design must be reconsidered.

### Risk Acceptance

For each hazard with acceptable or tolerable residual risk, a decision must be made to accept that risk.

Risk acceptance requires:

- Clinical judgement that the risk is justified given the benefits of the system
- Confirmation that all reasonable mitigations have been applied
- Documentation of the decision and the rationale
- Approval by appropriate authority (typically the Clinical Safety Officer or senior responsible officer)

Risk acceptance is not passive. It is an active decision with accountability.

### Deployment and Release

Before a healthcare IT system is deployed or released, a safety case report is produced summarising:

- All identified hazards
- Risk assessments (initial and residual)
- Mitigations applied
- Residual risks accepted
- Governance and accountability

This report supports deployment decisions and provides evidence for regulatory compliance.

Deployment itself is a change that may introduce new hazards, and so deployment processes are themselves subject to safety assessment.

### Ongoing Monitoring and Review

Once deployed, the system enters operational use, but clinical risk management continues.

Ongoing activities include:

- Monitoring for incidents or near misses
- Reviewing hazards when changes are made
- Identifying new hazards as the system evolves
- Reassessing risks if the clinical context changes
- Periodic audit of the clinical risk management system

If incidents occur, they are investigated and may result in:

- Updates to existing hazard assessments
- Identification of new hazards
- Additional mitigations
- Changes to the system

The hazard log is a living document, continuously updated throughout the system's life.

### Decommissioning

When a system is withdrawn from service, decommissioning itself may introduce hazards (such as data loss or disruption to care pathways).

Decommissioning should be treated as a change, with its own hazard identification and risk assessment.

## Governance and Accountability Model

Clinical safety governance defines who is responsible for what, and how decisions are made.

### Clinical Responsibility

Ultimate clinical responsibility for the safety of a healthcare IT system rests with a named Clinical Safety Officer who:

- Is a registered healthcare professional
- Has appropriate training in clinical risk management
- Has organisational authority to influence or halt deployment

The Clinical Safety Officer provides independent clinical judgement, separate from commercial or delivery pressures.

### Ownership of Hazards and Risks

Each hazard is assigned to a named individual responsible for:

- Ensuring the hazard is assessed
- Coordinating mitigation activities
- Tracking the status of the hazard
- Updating the hazard record

By default, hazards are assigned to the Clinical Safety Officer, but may be delegated to others with appropriate competence.

### Review and Sign-Off

Safety documentation (hazard logs, risk assessments, safety case reports) must be reviewed and approved by appropriate personnel.

Review is not a formality. Reviewers are expected to:

- Critically assess the completeness of hazard identification
- Challenge risk assessments if they appear unjustified
- Verify that mitigations are credible and implemented
- Confirm that residual risks are acceptable

Approval is documented with:

- Name and role of approver
- Date of approval
- Any conditions or caveats

### Separation of Concerns

To avoid conflicts of interest, clinical risk management should be organisationally separate from:

- Development and delivery pressures
- Commercial incentives
- Performance targets that might compromise safety

The Clinical Safety Officer should have a reporting line that ensures independence.

### Escalation and Decision Authority

When disagreements arise (for example, differing views on risk acceptability), there must be clear escalation paths and ultimate decision authority.

Typically:

- The Clinical Safety Officer has authority over clinical safety matters
- Senior responsible officers or executives provide final accountability
- In cases of unresolved concern, deployment may be paused until resolution

### Incident Response

When safety incidents occur, governance structures must support:

- Immediate action to mitigate harm
- Investigation to identify causes
- Updates to the hazard log
- Changes to the system or processes
- Reporting to regulators if required

Incident management is integrated with clinical risk management, not separate from it.

## Regulatory Alignment

Turva is designed to support compliance with NHS England clinical safety standards, specifically DCB0129 (manufacture of healthcare IT systems) and DCB0160 (deployment and use of healthcare IT systems).

### DCB0129: Manufacture

DCB0129 applies to organisations developing healthcare IT systems. It requires:

- Establishment of a clinical risk management system
- Appointment of a Clinical Safety Officer
- Hazard identification and risk assessment throughout development
- Production of a clinical safety case
- Evidence that residual risks are acceptable

Turva supports these requirements by managing hazard logs, risk assessments, and safety cases in a structured, auditable manner.

### DCB0160: Deployment and Use

DCB0160 applies to organisations deploying and using healthcare IT systems. It requires:

- A clinical risk management system for deployment
- Appointment of a Clinical Safety Officer
- Assessment of the system in its local context
- Ongoing monitoring and incident management
- Maintenance of safety documentation

Turva supports these requirements by enabling ongoing hazard management, context-specific risk assessment, and continuous audit trails.

### Evidence Generation

Both DCB0129 and DCB0160 emphasise evidence-based safety assurance, not just completion of templates.

Turva treats evidence as a first-class concern:

- All decisions are traceable to named individuals
- Changes to hazards and risks are versioned
- Discussions and justifications are captured
- Supporting documentation is linked to specific hazards

The system enables generation of evidence, not just documents.

### Assurance and Audit

Regulators and auditors require demonstration that the clinical risk management system is operating effectively.

Turva supports assurance by:

- Maintaining complete audit trails
- Providing transparent access to safety information
- Enabling review of decision-making processes
- Supporting periodic audit of compliance

The platform does not guarantee compliance, but it provides the infrastructure to demonstrate compliance if the underlying safety work is done properly.

## Evidence and Audit Model

Clinical safety is ultimately about evidence: demonstrating that risks have been identified, assessed, mitigated, and accepted in a justifiable manner.

### Traceability

Every safety decision must be traceable to:

- The individual who made it
- The date it was made
- The rationale and evidence supporting it

Traceability exists at multiple levels:

- Individual hazard records show who assessed, mitigated, and accepted each risk
- Version control provides a complete history of changes
- Approvals and sign-offs are attributed and timestamped

Without traceability, safety assurance is impossible.

### Change History

Because safety decisions are made in the context of a particular system state, it is essential to know:

- What the system looked like when a decision was made
- What changed subsequently
- Whether previous decisions remain valid

Version control is superior to manual document versioning because it:

- Preserves every historical state
- Shows exactly what changed and when
- Attributes changes to specific individuals
- Prevents accidental or malicious alteration of history

### Decision Provenance

For any residual risk accepted, it must be possible to reconstruct:

- Why the risk was considered acceptable
- What alternatives were considered
- What clinical judgement underpinned the decision
- Who approved the decision

This requires capturing not just the outcome (risk accepted) but the reasoning.

### Justification of Risk Decisions

Accepting a risk is not arbitrary. Each acceptance must be justified by:

- Evidence that mitigations are effective
- Clinical judgement that residual risk is proportionate to benefit
- Confirmation that all reasonable efforts have been made

Justifications should be explicit, not implied.

### Audit Readiness

At any time, an auditor should be able to:

- Review the complete hazard log
- Trace each hazard from identification through mitigation and acceptance
- See who made decisions and on what basis
- Verify that the clinical risk management system is being followed

This requires structured, consistent record-keeping, not ad hoc documentation.

### Immutable Records

Safety records must not be subject to undetected alteration. If a mistake is made, it should be corrected transparently with a new version, not by silently editing history.

Version control provides this property. Spreadsheet-based systems do not.

## Information Architecture

Turva manages several types of artefacts, each with specific purposes and relationships.

### Hazard Log

The hazard log is the central record of all identified hazards for a project.

Each entry in the hazard log includes:

- Hazard identifier and name
- Description of the hazard
- Cause or causes
- Effect on care pathway
- Potential harm
- Severity and likelihood scores
- Risk level (initial and residual)
- Status (open, closed, transferred)
- Mitigations applied
- Evidence and discussion
- Ownership and assignment

The hazard log is not a static document. It evolves as hazards are identified, assessed, mitigated, and closed.

### Risk Assessment Records

Each hazard has associated risk assessment records:

- Initial risk assessment (before new mitigations)
- Residual risk assessment (after mitigations)

Risk assessments include:

- Severity score and justification
- Likelihood score and justification
- Calculated risk level
- Date and assessor
- Approval status

### Safety Case Report

The safety case report is a summary document, typically generated at deployment, that presents:

- Overview of the system and its intended use
- Description of the clinical risk management process
- Summary of all hazards and their risk levels
- Evidence of mitigations
- Statement of residual risks accepted
- Governance and accountability
- Approval and sign-off

The safety case report is derived from the hazard log and related records, not maintained separately.

### Clinical Risk Management Plan

The clinical risk management plan describes how clinical risk management will be conducted for a specific project.

It includes:

- Scope of the project
- Roles and responsibilities
- Processes for hazard identification, risk assessment, and mitigation
- Governance arrangements
- Review and approval mechanisms
- Links to the organisational clinical risk management system

### Personnel and Credentials

Information about personnel involved in clinical safety includes:

- Name and professional registration
- Role (Clinical Safety Officer, reviewer, etc.)
- Training and competency
- Responsibilities within the project

This information supports governance and provides assurance that decisions are made by appropriately qualified individuals.

### Supporting Evidence

Hazards and risk assessments may reference supporting evidence:

- Test results demonstrating effectiveness of mitigations
- Incident reports from similar systems
- Clinical guidelines or protocols
- User research findings
- Technical specifications

Supporting evidence should be linked to specific hazards, not stored in isolation.

### Audit and Assurance Records

Audit reports, assurance reviews, and compliance assessments are part of the clinical risk management file.

These records document:

- What was reviewed
- Findings and recommendations
- Actions taken in response
- Date and personnel involved

### Change Records

Records of changes to the system, including:

- Description of the change
- Rationale
- Affected hazards
- New hazards introduced
- Approval and sign-off

Changes are versioned and traceable.

## Reporting and Outputs

Turva generates reports and summaries to support different stakeholders and purposes.

### Hazard Summary

A hazard summary provides an overview of all hazards for a project, typically organised by risk level.

This is used by:

- Clinical Safety Officers to triage hazards requiring attention
- Development teams to prioritise mitigation work
- Governance boards to understand the overall safety profile

The summary may group hazards by:

- Risk level (unacceptable, mandatory elimination, undesirable, acceptable)
- Status (open, closed, transferred)
- Type (medication-related, patient identification, system failure, etc.)

### Safety Case Report 2

The safety case report is the formal output presented at deployment or for regulatory review.

It is used by:

- Senior responsible officers to approve deployment
- Regulators to assess compliance
- Auditors to verify safety processes

The report is generated from the structured safety information, ensuring consistency between working records and published reports.

### Audit Trail Report

An audit trail report shows the history of changes to the hazard log, including:

- What changed
- When
- Who made the change

This is used during audits and assurance reviews to demonstrate proper governance.

### Risk Profile Report

A risk profile report shows the distribution of hazards across risk levels and categories.

This is used to:

- Identify areas of concern (many high-risk hazards in a particular category)
- Track progress in risk reduction over time
- Compare risk profiles across projects or organisations

### Compliance Evidence

Reports demonstrating compliance with DCB0129, DCB0160, or other standards.

These reports map requirements to evidence, showing:

- Which requirements apply
- How each requirement is met
- Where evidence can be found

## Non-Goals

Explicit non-goals help clarify what Turva is not responsible for.

### Not a Clinical Decision System

Turva does not make clinical decisions. It supports clinical decision-making by providing structured information, but clinical judgement remains the responsibility of qualified professionals.

### Not Real-Time Patient Safety

Turva is not designed to prevent harm in real time. It is a risk management and assurance system, not a patient monitoring or alerting system.

### Not a Replacement for Competence

Using Turva does not substitute for:

- Clinical training and registration
- Risk management competency
- Understanding of healthcare IT systems
- Professional judgement

The system assumes competent users.

### Not a Guarantee of Safety

No system can guarantee absolute safety. Turva supports the safety process, but residual risks remain, and unforeseen hazards may emerge.

### Not Universal

Turva is designed to support NHS England clinical safety standards (DCB0129 and DCB0160). While principles may be applicable elsewhere, compliance with other regulatory frameworks is not guaranteed.

### Not an Incident Management System

While Turva supports the link between incidents and hazards, it is not a comprehensive incident reporting or investigation platform.

### Not a Project Management Tool

Turva manages clinical safety information, not general project tasks, schedules, or deliverables. It is complementary to, not a replacement for, project management systems.

## Design Principles

These principles, inferred from the Digital Clinical Safety Platform, should guide Turva's development.

### Safety as a First-Class Concern

Safety is not a box-ticking exercise. It is integral to every aspect of the system. Safety information is structured, persistent, and auditable by default.

### Structured over Free-Text Where Safety Matters

Clinical safety requires consistency and comparability. Severity scores, likelihood assessments, and risk levels must be structured to enable filtering, sorting, and aggregation.

Narrative descriptions, justifications, and evidence remain free-text, as these require nuance.

### Human Readability

Safety information is for humans to read, discuss, and act upon. The system must prioritise clarity and understandability over machine-optimised representations.

Generated reports and summaries should be readable by clinicians, regulators, and auditors without specialised training.

### Auditability by Default

Every action that affects safety information should be:

- Attributed to a named user
- Timestamped
- Traceable through history
- Resistant to undetected alteration

Version control principles underpin this.

### Minimising Administrative Burden

Clinical safety is essential, but administrative overhead can be a barrier. The system should:

- Reduce duplication (safety information entered once, used in multiple reports)
- Automate what can be automated (risk level calculation, report generation)
- Guide users through processes (templates, workflows)
- Avoid unnecessary complexity

### Transparency and Openness

Where appropriate, safety information should be public and transparent. This:

- Builds trust
- Enables external review and challenge
- Demonstrates accountability
- Supports learning across organisations

Some projects may require confidentiality, so access controls are necessary, but the default posture is openness.

### Continuous, Not Phase-Gated

Clinical risk management is not a linear, phase-gated process. Hazards are identified and assessed continuously, and the hazard log evolves throughout the system's life.

The system should support iterative, continuous workflows, not rigid stage gates.

### Evidence-Linked

Assertions about safety must be backed by evidence. Wherever possible, evidence should be linked directly to the hazards and mitigations it supports.

### Interoperability with Development Practices

Healthcare IT systems are increasingly developed using modern software engineering practices (continuous integration, version control, automated testing). Clinical risk management should integrate with, not obstruct, these practices.

The system should support, for example:

- Linking hazards to code changes
- Triggering safety review when certain files are modified
- Generating safety status reports automatically

### Separation of Content and Presentation

Safety information is the content. How it is presented (as a web page, a PDF, a dashboard) is separate.

This enables:

- Multiple views of the same information
- Adaptation to different stakeholder needs
- Evolution of presentation without loss of underlying data

### No Vendor Lock-In

Safety information should be portable. Data formats should be open, and export should be straightforward. Organisations must be able to migrate to different systems without losing safety records.

### Proportionate to Risk

Not all healthcare IT systems require the same level of clinical risk management. The system should support proportionate approaches:

- Simple systems with low risk require lighter processes
- Complex, high-risk systems require comprehensive hazard management

The system should not impose unnecessary overhead on low-risk projects.

---

This specification describes the essential domain model, workflows, and principles of Turva. It is derived from the Digital Clinical Safety Platform and reflects current understanding of clinical risk management in healthcare IT. As Turva evolves, this specification may be refined, but the core concepts and principles should remain stable.
