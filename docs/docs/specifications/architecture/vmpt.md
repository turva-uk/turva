# VMPT Stack for Clinical Safety Documentation

The VMPT stack (Version control, Markdown, Placeholders, Templates) is Turva's approach to managing clinical safety documentation. It brings software engineering best practices to clinical risk management.

## What is VMPT?

VMPT is an acronym for four key technologies that work together to create a modern clinical safety documentation system:

- **V**: Version Control (Git)
- **M**: Markdown
- **P**: Placeholders
- **T**: Templates

## The Problem with Traditional Clinical Safety Documentation

Traditional clinical risk management relies on:

- **Word documents** in SharePoint folders
- **Excel spreadsheets** for hazard logs
- **Email threads** for decisions and approvals
- **Manual versioning** (filename_v1.docx, filename_final_FINAL.docx)
- **No audit trail** of who changed what and when
- **Difficult collaboration** with locking and merge conflicts

This approach is:

- **Error-prone**: Easy to lose track of latest version
- **Unauditable**: No clear record of changes
- **Slow**: Manual processes delay safety assessments
- **Opaque**: Hard to see decision-making process
- **Non-collaborative**: One person editing at a time

## How VMPT Solves These Problems

### V: Version Control (Git)

**What it is:** Git is a distributed version control system that tracks every change to every file.

**Why it matters for clinical safety:**

- **Complete audit trail**: Every change is recorded with who, what, when, and why
- **Immutable history**: Cannot alter past records without detection
- **Branching for reviews**: Safety assessments can be reviewed before merging
- **Collaboration**: Multiple people can work simultaneously
- **Rollback capability**: Can return to any previous state
- **Accountability**: Every change attributed to a named individual

**Example workflow:**

```bash
# Clinical Safety Officer creates a new hazard
git checkout -b hazard/001-wrong-patient
echo "# Hazard 001: Wrong Patient Selected" > hazards/001.md
git add hazards/001.md
git commit -m "Add hazard 001: Wrong patient selection risk"
git push origin hazard/001-wrong-patient

# Reviewer comments on pull request
# CSO addresses feedback
git commit -m "Update risk assessment based on review"

# Hazard approved and merged to main
git checkout main
git merge hazard/001-wrong-patient
```

**Result:** Complete history of hazard creation, review, and approval with timestamps and attribution.

### M: Markdown

**What it is:** Markdown is a lightweight markup language for creating formatted text using plain text syntax.

**Why it matters for clinical safety:**

- **Human-readable**: Can be read and edited without special software
- **Version control friendly**: Text files diff well in Git
- **Platform-independent**: Not locked to Microsoft Word
- **Future-proof**: Plain text will always be readable
- **Searchable**: Easy to grep and search across documents
- **Portable**: Can be converted to PDF, HTML, Word, etc.

**Example hazard documentation:**

```markdown
# Hazard 001: Wrong Patient Selected

## Description

User selects incorrect patient record from search results due to similar names.

## Cause

- Inadequate patient identification controls
- Similar patient demographics
- User interface design allowing quick selection without verification

## Effect

Clinical data entered into wrong patient record, leading to:

- Incorrect treatment decisions
- Patient safety incident
- Data breach

## Harm

- **Severity**: 4 (Major - potential for serious patient harm)
- **Likelihood**: 3 (Medium - may occur occasionally)
- **Risk Level**: 4 (Mandatory risk elimination)

## Mitigations

1. Add patient photo to selection screen
2. Require confirmation step before proceeding
3. Display patient DOB, NHS number, and address
4. Implement "time out" verification checklist

## Residual Risk

- **Severity**: 4 (Major - unchanged)
- **Likelihood**: 1 (Very low - controlled by design)
- **Risk Level**: 2 (Acceptable with justification)

## Sign-off

- **CSO**: Dr. Jane Smith - 2026-01-15
- **Reviewer**: Dr. John Doe - 2026-01-16
```

**Benefits:**

- **Easy to edit**: Any text editor works
- **Clear structure**: Headings, lists, and emphasis are obvious
- **Diffable**: Git shows exactly what changed between versions
- **Renderable**: Converts to beautiful HTML for reading

### P: Placeholders

**What it is:** Placeholders are variables in templates that get replaced with actual values when generating documents.

**Why it matters for clinical safety:**

- **Consistency**: Same information used across all documents
- **Accuracy**: Single source of truth for key data
- **Efficiency**: No manual copy-paste of repeated information
- **Maintainability**: Update once, reflected everywhere

**Example template with placeholders:**

```markdown
# Clinical Safety Case for {{system_name}}

## System Information

- **System Name**: {{system_name}}
- **Version**: {{system_version}}
- **Clinical Safety Officer**: {{cso_name}} ({{cso_registration}})
- **Manufacturer**: {{manufacturer_name}}
- **Deployment Date**: {{deployment_date}}

## Intended Use

{{intended_use_description}}

## Hazard Log Summary

- Total hazards identified: {{total_hazards}}
- High risk hazards: {{high_risk_count}}
- All high risks mitigated: {{all_mitigated}}

## Conclusion

The clinical safety case for {{system_name}} version {{system_version}}
demonstrates that all identified hazards have been assessed and mitigated
to acceptable levels. Deployment is recommended.

**CSO Approval**: {{cso_name}}, {{approval_date}}
```

**Values file (JSON):**

```json
{
  "system_name": "Turva Clinical Safety Platform",
  "system_version": "1.0.0",
  "cso_name": "Dr. Mark Bailey",
  "cso_registration": "GMC 123456",
  "manufacturer_name": "Turva UK Ltd",
  "deployment_date": "2026-03-01",
  "intended_use_description": "Clinical safety management platform for healthcare IT systems...",
  "total_hazards": 24,
  "high_risk_count": 3,
  "all_mitigated": true,
  "approval_date": "2026-01-16"
}
```

**Generated output:**

```markdown
# Clinical Safety Case for Turva Clinical Safety Platform

## System Information

- **System Name**: Turva Clinical Safety Platform
- **Version**: 1.0.0
- **Clinical Safety Officer**: Dr. Mark Bailey (GMC 123456)
- **Manufacturer**: Turva UK Ltd
- **Deployment Date**: 2026-03-01
  ...
```

**Implementation:**

Turva uses Jinja2 templating engine:

```python
# example_template/build.py
from jinja2 import Environment, FileSystemLoader
import json

# Load template
env = Environment(loader=FileSystemLoader('template/'))
template = env.get_template('safety_case.md')

# Load values
with open('values.json') as f:
    values = json.load(f)

# Render document
output = template.render(**values)

# Save rendered document
with open('output/safety_case.md', 'w') as f:
    f.write(output)
```

[Source: example_template/build.py](../../example_template/build.py)

### T: Templates

**What it is:** Templates are pre-structured documents that can be reused across multiple projects with different values.

**Why it matters for clinical safety:**

- **Compliance**: Templates ensure all required sections are included
- **Best practices**: Capture expert knowledge in reusable forms
- **Efficiency**: Don't start from blank page every time
- **Consistency**: All safety cases follow same structure
- **Sharing**: Templates can be published and reused across organizations

**Template library structure:**

```text
templates/
├── dcb0129-manufacturer/
│   ├── clinical_risk_management_plan.md
│   ├── hazard_log.md
│   ├── clinical_safety_case_report.md
│   └── values.json
├── dcb0160-deployment/
│   ├── deployment_assessment.md
│   ├── local_hazard_log.md
│   └── values.json
└── nhs-digital-assessment/
    ├── compliance_checklist.md
    └── values.json
```

**Template example (clinical risk management plan):**

```markdown
# Clinical Risk Management Plan

## {{system_name}} - {{system_version}}

### 1. Scope

This clinical risk management plan applies to {{system_name}},
a {{system_type}} intended for use in {{clinical_setting}}.

### 2. Clinical Safety Officer

**Name**: {{cso_name}}
**Registration**: {{cso_registration}}
**Contact**: {{cso_email}}

### 3. Hazard Identification Process

{{#each hazard_identification_methods}}

- {{this}}
  {{/each}}

### 4. Risk Assessment Matrix

| Severity         | Likelihood    | Risk Level       |
| ---------------- | ------------- | ---------------- |
| 5 (Catastrophic) | 5 (Very High) | 5 (Unacceptable) |
| ...              | ...           | ...              |

### 5. Risk Acceptability Criteria

{{risk_acceptability_criteria}}

### 6. Governance

{{governance_structure}}

---

**Approved by**: {{cso_name}}
**Date**: {{approval_date}}
**Version**: {{document_version}}
```

**Benefits of templates:**

- **Regulatory compliance**: Templates ensure DCB0129/DCB0160 requirements are met
- **Knowledge capture**: Expert clinical safety knowledge encoded in structure
- **Rapid deployment**: New projects start with complete documentation structure
- **Peer review**: Templates can be reviewed and improved by safety community
- **Version control**: Templates themselves are versioned in Git

## VMPT in Practice: Full Workflow

### 1. Project Initialization

```bash
# Create new project from template
turva init --template dcb0129-manufacturer --name "Patient Portal"

# This creates:
project/
├── hazards/          # Hazard markdown files
├── mitigations/      # Mitigation records
├── safety_case/      # Generated safety case documents
├── templates/        # Document templates
├── values.json       # Project-specific values
└── .git/             # Version control
```

### 2. Hazard Identification

Clinical Safety Officer creates hazards as markdown files:

```bash
# Create new hazard
turva hazard create --id 001 --title "Wrong patient selection"

# Opens editor with template:
# hazards/001-wrong-patient.md
```

### 3. Risk Assessment

CSO fills in risk assessment in markdown:

```markdown
## Risk Assessment (Initial)

- Severity: 4
- Likelihood: 3
- Risk Level: 4 (Mandatory elimination)
```

Git commit records assessment:

```bash
git add hazards/001-wrong-patient.md
git commit -m "Initial risk assessment for hazard 001"
```

### 4. Mitigation Design

Add mitigations to hazard file:

```markdown
## Mitigations

1. Patient photo verification (MIT-001)
2. Confirmation dialog (MIT-002)
3. Display full demographics (MIT-003)
```

Create detailed mitigation records:

```markdown
# MIT-001: Patient Photo Verification

## Description

Display patient photograph on selection screen.

## Implementation

- Retrieve photo from PAS system
- Display 150x150px thumbnail
- Fallback to initials if no photo available

## Evidence

- Code review: PR #45
- Testing: TEST-PHOTO-001
- User acceptance: Clinicians report improved confidence
```

### 5. Residual Risk Assessment

After mitigations implemented:

```markdown
## Risk Assessment (Residual)

- Severity: 4 (unchanged)
- Likelihood: 1 (reduced from 3)
- Risk Level: 2 (Acceptable)

## Justification

Patient photo verification combined with confirmation dialog
significantly reduces likelihood of wrong patient selection.
```

### 6. Safety Case Generation

Generate safety case report from all hazards:

```bash
turva generate safety-case

# Uses templates + values.json to create:
# - safety_case/clinical_safety_case_report.pdf
# - safety_case/hazard_log_summary.pdf
# - safety_case/compliance_evidence.pdf
```

### 7. Review and Approval

Create pull request for review:

```bash
git checkout -b safety-case-v1.0
git add -A
git commit -m "Complete safety case for v1.0 release"
git push origin safety-case-v1.0

# Create PR on GitHub
# Reviewers comment on specific hazards
# CSO addresses feedback
# PR approved and merged
```

### 8. Continuous Updates

System changes trigger hazard review:

```bash
# Developer changes patient selection UI
git commit -m "Add patient search filters"

# Turva automatically flags related hazards
# hazard 001: Wrong patient selection - REQUIRES REVIEW

# CSO reviews hazard
# Updates assessment if needed
# Approves change
```

## Technical Implementation in Turva

### Hazard Storage

Hazards stored as structured markdown with YAML frontmatter:

```markdown
---
id: 001
title: Wrong patient selection
status: open
severity: 4
likelihood: 1
risk_level: 2
assigned_to: dr.smith@example.com
created: 2026-01-15
updated: 2026-01-16
---

# Hazard 001: Wrong Patient Selection

## Description

...
```

### Template Engine

Jinja2 processes templates with values:

```python
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader('templates/'))
template = env.get_template('safety_case.md')

values = load_values_from_db()  # or values.json
output = template.render(**values)
```

### Version Control Integration

Git tracks all changes:

```python
import subprocess

def commit_hazard(hazard_id, message):
    subprocess.run(['git', 'add', f'hazards/{hazard_id}.md'])
    subprocess.run(['git', 'commit', '-m', message])

def get_hazard_history(hazard_id):
    result = subprocess.run(
        ['git', 'log', '--', f'hazards/{hazard_id}.md'],
        capture_output=True, text=True
    )
    return parse_git_log(result.stdout)
```

### Document Generation

Convert markdown to PDF:

```python
import pypandoc

def generate_safety_case_pdf(template_file, values, output_file):
    # Render template
    template = env.get_template(template_file)
    markdown = template.render(**values)

    # Convert to PDF via Pandoc
    pypandoc.convert_text(
        markdown,
        'pdf',
        format='md',
        outputfile=output_file,
        extra_args=['--toc', '--number-sections']
    )
```

## Benefits of VMPT for Clinical Safety

### For Clinical Safety Officers

- **Audit trail**: Complete history of every safety decision
- **Transparency**: All stakeholders can see current state and history
- **Efficiency**: Templates and placeholders reduce manual work
- **Confidence**: Version control prevents accidental data loss

### For Development Teams

- **Integration**: Clinical safety embedded in development workflow
- **Visibility**: Developers see impact of their changes on safety
- **Collaboration**: Work together with CSO in same system

### For Regulators and Auditors

- **Traceability**: Can trace every decision back to original assessment
- **Immutable records**: Cannot alter history without detection
- **Standard format**: Consistent documentation across organizations
- **Evidence generation**: Easy to extract compliance evidence

### For Organizations

- **Cost reduction**: Less time on administrative overhead
- **Knowledge retention**: Templates and history preserved in Git
- **Risk reduction**: Better safety outcomes through systematic process
- **Scalability**: Same process works for 1 project or 100 projects

## Comparison with Traditional Methods

| Aspect                    | Traditional (Word/Excel)  | VMPT Stack                         |
| ------------------------- | ------------------------- | ---------------------------------- |
| **Versioning**            | Manual (filename_v2.docx) | Automatic (Git)                    |
| **Audit trail**           | None or manual changelog  | Complete with attribution          |
| **Collaboration**         | Sequential (file locking) | Parallel (branches)                |
| **Searchability**         | Limited (Windows search)  | Full-text across all files         |
| **Portability**           | Locked to Word/Excel      | Plain text, any editor             |
| **Automation**            | Copy-paste                | Templates + placeholders           |
| **Review process**        | Email attachments         | Pull requests with inline comments |
| **Backup**                | Manual or SharePoint      | Git push to remote                 |
| **Merge conflicts**       | Lost work                 | Git merge with conflict resolution |
| **Regulatory compliance** | Manual checklist          | Automated compliance checks        |

## Future Enhancements

### Planned VMPT Features

1. **Automated hazard tagging**: Link hazards to code changes automatically
2. **Compliance checking**: Validate safety case completeness before deployment
3. **Template marketplace**: Share and download templates from community
4. **AI-assisted hazard identification**: Suggest hazards based on system changes
5. **Real-time collaboration**: Multiple users editing simultaneously
6. **Automated report generation**: Schedule regular safety case exports

## Related Documentation

- [Architecture Overview](index.md)
- [Backend Architecture](backend.md) - Template processing implementation
- [DCB0129/DCB0160 Compliance](../copilot-instructions.md#regulatory-alignment)
