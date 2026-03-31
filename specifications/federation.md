# Federation: Sharing Clinical Safety Knowledge

## The Problem with Isolated Safety Cases

Currently, every organization recreates clinical safety work:

- **Hospital A** assesses risks for a patient portal → 24 hazards identified
- **Hospital B** deploys the same portal → Starts from scratch, identifies 18 hazards (misses 6)
- **Manufacturer** already wrote a safety case → Each deployer rewrites it with local context

**Result**: Duplicated effort, inconsistent quality, and missed hazards.

## Federation Model

Turva enables safety cases to flow between organizations in three directions:

### 1. Downstream: Manufacturer → Deployers

**Manufacturer** (e.g., EPR vendor) publishes DCB0129 safety case for their system.

**Deployers** (e.g., NHS trusts) inherit the manufacturer's hazard log and add local context:

- Import manufacturer's 45 hazards
- Add 8 local hazards (e.g., integration with legacy systems)
- Override 3 risk assessments based on local workflows
- Generate DCB0160 deployment safety case

**Benefits**:
- Deployers start from expert baseline, not blank page
- Manufacturers maintain canonical safety case, deployers extend it
- Changes to manufacturer safety case can propagate to deployers

### 2. Upstream: Small Orgs → National Bodies

**Small organizations** (e.g., GP practices, care homes) lack dedicated clinical safety resources.

**Larger organizations** or **national bodies** (e.g., NHS England, professional associations) publish pre-assessed safety cases for common systems.

**Example**: NHS England publishes safety case for GP appointment booking system. Individual practices inherit it, add practice-specific context (e.g., patient demographics), and deploy.

**Benefits**:
- Democratizes access to clinical safety expertise
- Smaller organizations don't need full-time CSO for simple systems
- National bodies ensure baseline safety standards

### 3. Lateral: Peer Organizations Share Knowledge

**Similar organizations** (e.g., acute trusts, mental health trusts) share hazard logs for comparable systems.

**Example**:
- Trust A identifies 12 hazards for telehealth platform
- Trust B deploying similar platform searches Turva's public projects
- Finds Trust A's hazard log, imports relevant hazards, avoids missing key risks

**Benefits**:
- Cross-organizational learning
- Crowdsourced hazard identification
- Benchmarking: "Are we missing hazards others found?"

## Public vs Private Projects

### Public Projects (Default)

Safety cases are visible to all Turva users. Benefits:

- **Transparency**: Demonstrates commitment to patient safety
- **External scrutiny**: Community can challenge and improve assessments
- **Knowledge sharing**: Others learn from your work
- **Reputational**: "We're confident enough to publish our safety case"

**Use for**: Standard systems, mature products, organizations committed to openness.

### Private Projects

Safety cases restricted to named team members. Justified when:

- **Commercial sensitivity**: Pre-release products
- **Security**: Disclosing hazards might create attack vectors
- **Competitive**: Proprietary clinical workflows
- **Legal**: Contractual confidentiality

**Governance requirement**: Decision to make project private must be documented and approved.

## Federation Workflows

### Inheriting a Safety Case

1. **Search** public projects for similar systems
2. **Review** candidate safety case (hazards, assessments, mitigations)
3. **Fork** the safety case into new project
4. **Customize** for local context:
   - Mark irrelevant hazards as "not applicable"
   - Add local hazards
   - Override risk assessments if local context differs
   - Add local mitigations
5. **Maintain link** to upstream safety case
6. **Receive updates**: If upstream safety case changes (e.g., new hazard identified), notification alerts local CSO

### Publishing a Safety Case

1. **Create project** in Turva
2. **Set visibility** to public
3. **Complete safety case** (hazards, assessments, mitigations)
4. **Tag release** (e.g., "v1.0-dcb0129-approved")
5. **Add metadata**:
   - System type (EPR, telehealth, prescribing)
   - Clinical context (acute, primary care, mental health)
   - Regulatory status (DCB0129 approved, in progress)
6. **Publish**: Now discoverable by other organizations

### Contributing Back to Upstream

**Scenario**: Hospital deploys manufacturer's system, identifies new hazard not in manufacturer's safety case.

1. Hospital adds hazard to local (forked) safety case
2. Hospital proposes hazard to manufacturer via pull request
3. Manufacturer reviews proposal
4. If accepted, manufacturer merges into canonical safety case
5. All other deployers notified of new hazard

**Result**: Distributed hazard identification improves safety for all users.

## Governance and Attribution

### Ownership and Accountability

- **Forked safety case**: Inheriting organization becomes owner, responsible for local assessments
- **Original safety case**: Upstream organization retains ownership, not liable for downstream customizations
- **Attribution**: Turva tracks lineage (e.g., "Forked from NHS Trust A's EPR safety case v2.1")

### Approval Workflow

- **Upstream changes**: If manufacturer updates safety case, deployers receive notification but changes don't auto-apply
- **Review required**: Local CSO must review and approve upstream changes before merging
- **Audit trail**: History shows when changes were pulled, who reviewed, who approved

### Liability

- **Manufacturer** liable for their published safety case under DCB0129
- **Deployer** liable for local deployment safety case under DCB0160
- **Inheritance is a starting point**, not a delegation of responsibility

## Technical Implementation

### Project Relationships

Projects have:
- **Upstream source**: Link to project this was forked from (if any)
- **Downstream forks**: List of projects that forked from this one
- **Sync status**: Which upstream version is this fork based on?

### Hazard Provenance

Each hazard tagged with:
- **Origin**: Created locally, inherited from upstream, suggested by community
- **Override status**: Using upstream assessment or locally modified?
- **Sync state**: Matches upstream, diverged, or upstream deleted

### Diff and Merge

When upstream safety case changes:
- **Diff view**: Show changes since last sync (new hazards, modified assessments)
- **Selective merge**: CSO chooses which changes to pull
- **Conflict resolution**: If local and upstream both modified same hazard, CSO decides

### Search and Discovery

Public projects searchable by:
- **System type**: EPR, PACS, telehealth, prescribing
- **Clinical setting**: Acute, primary care, mental health, community
- **Regulatory status**: DCB0129 approved, DCB0160 compliant
- **Organization**: NHS trust, private hospital, manufacturer
- **Hazard keywords**: Medication errors, wrong patient, data loss

## Federation Use Cases

### Use Case 1: GP Practice Deploys Appointment System

**Context**: Small GP practice (5 partners, no CSO) wants to deploy online appointment booking.

**Federation workflow**:
1. Search Turva for "appointment booking, primary care"
2. Find NHS England's pre-approved safety case
3. Fork safety case into local project
4. Add local hazards (e.g., elderly patient population with low digital literacy)
5. Generate DCB0160 deployment safety case
6. Practice manager (with clinical safety training) signs off

**Result**: Safe deployment without full-time CSO.

### Use Case 2: EPR Vendor Updates Product

**Context**: EPR vendor releases v3.0 with new prescribing module.

**Federation workflow**:
1. Vendor updates canonical DCB0129 safety case (adds 12 prescribing hazards)
2. Turva notifies all 50 NHS trusts that forked this safety case
3. Each trust CSO reviews new hazards
4. Trusts decide: accept all, accept some, or reject (with justification)
5. Trusts re-submit DCB0160 safety cases if high-risk changes

**Result**: Consistent hazard awareness across all deployments.

### Use Case 3: Peer Learning

**Context**: Mental health trust deploying video consultation platform.

**Federation workflow**:
1. Search Turva for "telehealth, mental health"
2. Find 3 similar trusts with public safety cases
3. Review their hazard logs:
   - Trust A identified "patient in crisis during remote session" (severity 4)
   - Trust B identified "clinician misses non-verbal cues" (severity 3)
   - Trust C identified "video session recorded without consent" (severity 3)
4. Import all 3 hazards into local safety case
5. Add local mitigations and assessments

**Result**: Better coverage, avoided missing critical hazards.

## Network Effects

Federation value increases with adoption:

- **1 organization**: Basic safety management
- **10 organizations**: Some knowledge sharing
- **100 organizations**: Rich hazard library, effective peer learning
- **1000 organizations**: Comprehensive coverage, near-certain identification of common hazards

**Goal**: Create a commons of clinical safety knowledge that lifts all participants.

## Privacy and Anonymization

### Public Projects

- **Anonymize patient data**: No patient names, NHS numbers, clinical details
- **Anonymize commercial info**: Can remove organization name if desired (published as "NHS Acute Trust")
- **Redact security details**: Don't publish specific vulnerabilities (e.g., "SQL injection in login form")

### Metadata Only Sharing

Organizations uncomfortable publishing full safety case can share metadata:
- "We identified 34 hazards for EPR deployment"
- "18% were integration-related"
- "Top 3 risk categories: wrong patient, medication error, data loss"

Even aggregate data helps others benchmark.

## Success Metrics

How do we measure federation success?

1. **Reuse rate**: Percentage of new projects that fork existing safety cases
2. **Hazard coverage**: Do forked projects identify more hazards than starting from scratch?
3. **Time to safety case**: Median time from project start to completed safety case
4. **Upstream contributions**: Number of hazards contributed back to upstream projects
5. **Public project ratio**: Percentage of projects marked public
6. **Network density**: Average number of forks per public project

## Challenges and Mitigations

### Challenge: "My organization is unique"

**Response**: True, but 80% of hazards are common across similar systems. Fork a baseline, add the 20% that's unique.

### Challenge: Legal/procurement barriers

**Response**: Work with vendors to include Turva-based safety case sharing in contracts. Make it a requirement for NHS procurement.

### Challenge: Competitive pressure

**Response**: Clinical safety is pre-competitive. Emphasize reputational benefit of transparency.

### Challenge: Quality control

**Response**: Community review, CSO sign-off required, audit trail. Poor-quality safety cases get criticized and improved.

---

Federation transforms clinical safety from isolated, duplicated effort into a collaborative, cumulative knowledge base. Turva makes federation technically possible; adoption makes it effective.
