# LLM Strategy: How AI Changes Clinical Safety Management

## The Disruption

In early 2023, a competent developer could use ChatGPT or Claude to generate a complete clinical safety case in 20-30 minutes. By 2025, these LLMs understand DCB0129/DCB0160, can identify hazards from system descriptions, assess risks, and draft mitigations in seconds.

**The uncomfortable question**: Why build a clinical safety platform when an LLM can generate the entire safety case?

## Why Turva Still Matters

### 1. Structure Enforces Rigor

LLMs generate free text. Turva enforces a structured risk assessment model:

- **Derived risk levels**: An LLM might say "moderate risk" inconsistently. Turva calculates risk level from severity and likelihood, preventing subjective downgrading.
- **Mandatory fields**: An LLM might skip assigning a hazard owner. Turva requires it.
- **Standardized scales**: LLMs use natural language ("unlikely", "rare", "possible"). Turva uses defined 1-5 scales with clear criteria.

Structure ensures consistency across hazards, projects, and organizations.

### 2. Audit Trails Are Non-Negotiable

An LLM conversation is ephemeral. Turva provides:

- **Immutable version history**: Every change attributed to a named person with timestamp
- **System state correlation**: Safety decisions linked to specific code versions
- **Regulatory evidence**: Complete audit trail meeting DCB0129/DCB0160 requirements

A regulator can't audit a ChatGPT conversation. They can audit Turva's version control.

### 3. Collaboration Requires Governance

Clinical safety is a team effort:

- **CSO approves**, developers identify hazards, clinical reviewers assess impact
- **Multiple contributors** but **explicit accountability**
- **Delegation is traceable**: Who did what, when, and with whose authority

LLMs generate content for one user at a time. Turva orchestrates multi-stakeholder workflows.

### 4. Federation Compounds Value

An LLM starts from scratch every time. Turva enables:

- **Manufacturers publish safety cases** that deployers inherit and extend
- **Organizations share hazard logs** so others don't duplicate effort
- **Public projects** contribute to collective safety knowledge
- **Reuse at scale**: A hazard identified once benefits the entire community

Network effects make Turva more valuable as adoption grows.

### 5. Regulatory Compliance Requires Evidence

LLMs produce outputs. Turva produces evidence:

- **Compliance reports** auto-generated from structured data
- **Mapping to standards**: Which DCB0129 requirement is met by which hazard/mitigation
- **Exportable audit trails**: Complete CSV/PDF exports for regulators
- **Sign-off records**: Named CSO approval with registration number

An LLM output is a claim. Turva output is proof.

## How Turva Uses LLMs

Rather than compete with LLMs, Turva integrates them as a force multiplier.

### Embedded Safety Expert LLM

Turva includes a fine-tuned LLM trained on:

- DCB0129/DCB0160 standards
- Historical hazard logs (from public projects)
- Clinical safety best practices
- NHS Digital guidance

**How it helps**:

- **Hazard identification**: "Describe your system" → LLM suggests 20 potential hazards
- **Risk assessment assistance**: "Why severity 4 not 5?" → LLM explains criteria
- **Mitigation brainstorming**: LLM suggests controls based on similar hazards
- **Safety case drafting**: LLM generates narrative from structured data
- **Review and challenge**: "Have you considered this hazard?" prompts critical thinking

### LLM as Assistant, Not Replacement

The LLM proposes; the CSO decides:

- **LLM suggests** a severity score → **CSO approves or overrides** → Decision recorded with justification
- **LLM drafts** a safety case section → **CSO reviews and edits** → Final version attributed to CSO
- **LLM identifies** potential hazards → **CSO filters and prioritizes** → Selected hazards tracked

The LLM accelerates work but doesn't eliminate accountability.

### Safety Case Generation Workflow

1. **CSO enters structured data** (hazards, assessments, mitigations) via forms
2. **Turva stores** in database with version control
3. **LLM generates narrative** from structured data
4. **CSO reviews** and edits generated text
5. **Turva exports** to PDF/Markdown with audit trail
6. **CSO signs off** with name and registration number

The LLM handles boilerplate; the CSO ensures clinical accuracy.

## What LLMs Enable That Wasn't Possible Before

### Intelligent Hazard Search

**Before**: Manual keyword search through hazard logs.

**With LLM**: "Show me hazards related to medication dosing errors in elderly patients" → Semantic search across all public projects.

### Automated Evidence Synthesis

**Before**: CSO manually writes "Mitigation MIT-001 is effective because..."

**With LLM**: "Summarize evidence for MIT-001's effectiveness" → LLM pulls from test results, code reviews, and incident reports.

### Contextual Guidance

**Before**: CSO reads DCB0129 PDF to understand requirements.

**With LLM**: "What does DCB0129 require for residual risk acceptance?" → Conversational guidance in context.

### Cross-Project Learning

**Before**: Each organization starts from scratch.

**With LLM**: "Find similar systems to mine and show their top hazards" → LLM identifies relevant public safety cases.

## LLM Fine-Tuning Strategy

### Training Data Sources

1. **Public Turva projects**: Organizations can opt to contribute anonymized safety cases
2. **Published safety cases**: Publicly available DCB0129/DCB0160 submissions
3. **Synthetic data**: Generated examples covering edge cases
4. **Domain expertise**: Clinical safety guidance documents, standards, textbooks

### Fine-Tuning Objectives

- **Hazard identification**: Given system description, suggest hazards
- **Risk assessment**: Justify severity/likelihood scores
- **Mitigation generation**: Suggest controls for given hazards
- **Safety case narrative**: Generate readable prose from structured data
- **Standards compliance**: Map requirements to evidence

### Model Selection

- **General capability**: Claude/GPT for broad reasoning
- **Domain-specific**: Fine-tuned smaller model for clinical safety specifics
- **Hybrid approach**: General LLM for generation, domain model for validation

Choice depends on cost, latency, and accuracy trade-offs.

## Privacy and Confidentiality

### Private Projects

LLM assistance for private projects must not leak data:

- **Local inference**: Option to run LLM on-premises for sensitive projects
- **No training on private data**: Private projects excluded from fine-tuning dataset
- **Data isolation**: LLM queries scoped to project's own data plus public knowledge

### Public Projects

Organizations opting for public projects contribute to collective safety knowledge:

- **Anonymization**: Remove organization names, patient details, commercial info
- **Explicit consent**: Projects marked public are knowingly contributed
- **Revocable**: Organizations can withdraw projects from training data

## Success Metrics

How do we know LLM integration is working?

1. **Time to complete safety case**: Baseline (manual) vs LLM-assisted
2. **Hazard identification coverage**: LLM-suggested hazards that CSO missed
3. **Risk assessment consistency**: Variation in severity/likelihood scores across similar hazards
4. **Adoption rate**: Percentage of CSOs using LLM features
5. **Quality indicators**: Regulatory approval rates, audit findings, incident correlation

## The Vision

**Turva = Structured Safety + LLM Assistance**

A CSO working on a new patient portal:

1. Describes the system in natural language
2. LLM suggests 30 potential hazards based on similar public projects
3. CSO selects 18 relevant hazards, adds 3 more from local context
4. LLM drafts initial risk assessments based on historical data
5. CSO reviews and adjusts severity/likelihood scores
6. LLM suggests mitigations for high-risk hazards
7. CSO implements controls, marks hazards as mitigated
8. LLM generates safety case narrative from structured data
9. CSO reviews, edits, and approves
10. Turva exports compliance evidence for DCB0129 submission

**Result**: A rigorous, auditable safety case completed in hours instead of weeks, with the CSO's clinical judgment central to every decision.

## Open Questions

1. **Liability**: If an LLM suggests a mitigation that fails, who is accountable? (Answer: The CSO who approved it. LLM is a tool, not a decision-maker.)
2. **Regulatory acceptance**: Will NHS Digital accept LLM-assisted safety cases? (Answer: Yes, if audit trail shows human oversight and approval.)
3. **Model bias**: How do we prevent LLMs from perpetuating historical hazard identification gaps? (Answer: Diverse training data, human review, continuous monitoring.)
4. **Cost**: Running LLMs at scale is expensive. Can Turva be sustainable? (Answer: Freemium model - basic features free, advanced LLM assistance paid.)

---

This document outlines how Turva integrates LLMs to accelerate clinical safety work without compromising rigor, accountability, or regulatory compliance. LLMs are assistants, not replacements, for Clinical Safety Officers.
