# Clinical Risk Management Plan

## 1. Scope

This plan applies to the deployment of **{{ name }}** by {{ organisation }}. It describes how clinical risk is identified, assessed, controlled, and reviewed for this deployment, in accordance with DCB0160.

## 2. Clinical Safety Officer

|                           |                        |
| ------------------------- | ---------------------- |
| Name                      | {{ cso_name }}         |
| Professional registration | {{ cso_registration }} |
| Contact                   | {{ cso_email }}        |

The Clinical Safety Officer is accountable for the clinical safety of this deployment and has the authority to halt or delay it.

## 3. Hazard identification

Hazards are identified through:

- Review of the supplier's DCB0129 safety case and its stated deployment assumptions
- Workshops with clinical and operational staff who will use the system
- Walkthrough of the intended care pathway, before and after deployment
- Review of incidents from comparable deployments elsewhere

Hazard identification is repeated when the system, the pathway, or the user group changes.

## 4. Risk assessment

Each hazard is assessed for severity of harm and likelihood of occurrence on the five-point scales below. **Risk level is derived from the two and is never selected directly.**

### Severity

|     |                                                     |
| --- | --------------------------------------------------- |
| 1   | Minor - negligible consequence                      |
| 2   | Significant - minor injury with long-term effects   |
| 3   | Considerable - severe injury with expected recovery |
| 4   | Major - one death or life-changing incapacity       |
| 5   | Catastrophic - multiple deaths or severe injuries   |

### Likelihood

|     |                                                   |
| --- | ------------------------------------------------- |
| 1   | Very low - nearly negligible possibility          |
| 2   | Low - could occur but usually will not            |
| 3   | Medium - may occur occasionally                   |
| 4   | High - expected to occur in the majority of cases |
| 5   | Very high - certain or almost certain             |

### Resulting risk level

|     |                                                           |
| --- | --------------------------------------------------------- |
| 1   | Acceptable - no further action required                   |
| 2   | Acceptable if the cost of reduction exceeds the benefit   |
| 3   | Undesirable - attempts should be made to eliminate        |
| 4   | Mandatory elimination - must be reduced before deployment |
| 5   | Unacceptable - cannot proceed until reduced               |

Each hazard is assessed twice: an **initial** assessment before new controls, and a **residual** assessment after the controls in this file are in place.

## 5. Risk acceptability

{{ risk_acceptability_criteria }}

No hazard with a residual risk level of 4 or 5 may remain open at go-live. Residual risk level 3 requires documented justification and the Clinical Safety Officer's explicit acceptance.

## 6. Hierarchy of controls

Controls are preferred in this order, strongest first:

1. Eliminate the hazard through design or configuration
2. Reduce risk through technical controls
3. Warnings and alerts
4. Training and procedures

A safety argument resting mainly on training and procedure is weaker than one resting on design, and is treated as such in review.

## 7. Governance

{{ governance }}

## 8. Review

This file is reviewed:

- Before go-live
- On any change to the system, the care pathway, or the user group
- Following any clinical safety incident involving the system
- At least annually

A safety decision is valid only for the system state in which it was made. When that state changes, affected assessments are revisited rather than assumed to still hold.
