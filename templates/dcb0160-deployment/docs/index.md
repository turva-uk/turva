# {{ name }}

Clinical Safety Management File for the deployment of **{{ name }}** by {{ organisation }}, maintained under [DCB0160](https://digital.nhs.uk/services/clinical-safety/clinical-risk-management-standards).

## Status

|                         |                                                                             |
| ----------------------- | --------------------------------------------------------------------------- |
| Deploying organisation  | {{ organisation }}                                                          |
| Clinical Safety Officer | {{ cso_name }}{% if cso_registration %} ({{ cso_registration }}){% endif %} |
| Safety file status      | Draft - not yet approved                                                    |
| Created                 | {{ created }}                                                               |

## Intended use

{{ intended_use }}

## Scope of this file

This file covers the deployment and local configuration of the system named above within {{ organisation }}. Hazards arising from the manufacture of the system are the responsibility of the supplier and are recorded in their DCB0129 safety case, referenced where relied upon.

## Contents

- [Clinical risk management plan](clinical-risk-management-plan.md) - how safety is managed for this deployment
- [Hazard log](hazards/index.md) - identified hazards, assessments, and mitigations
- [Clinical safety case report](clinical-safety-case-report.md) - the safety argument and conclusion
