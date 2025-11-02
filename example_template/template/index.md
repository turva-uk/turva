# Hazard template document

Hello, {{user_name}}!

This document serves as a template for documenting hazards, their initial risks, mitigation measures, and residual risks. It demonstrates Turva's developing templating and logic capabilities.

The placeholders (denoted by \{\{...\}\}) will be replaced with specific information relevant to the hazard being documented by Turva's templating implementation.

## Hazards index
{% for hazard in hazards %}

### Hazard: {{hazard.hazard_name}}

#### Overview

{{hazard.hazard_description}}

Initial risk score: {{hazard.initial_risk_level}}
Residual risk score: {{hazard.risk_level}}

#### Mitigations

{{hazard.mitigation_measures}}
{% endfor %}
