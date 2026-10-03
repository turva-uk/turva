# Safety file storage layer

Reference documentation for `safety_file`, the package that reads and writes
Clinical Safety Management Files.

It is a plain Python package with no web framework dependency, which is what
makes it unit-testable without a server and what allowed it to survive the move
from FastAPI to Django untouched. See
[ADR 0001](https://github.com/turva-uk/turva/blob/main/specifications/adr/0001-use-django-for-phase-one.md).

The Django application is not documented here. Its models and views require a
configured Django environment to introspect, and the interesting behaviour lives
in this package.

## Risk derivation

The safety-critical module. Risk level is derived from severity and likelihood
and is never entered, so that a serious risk cannot be downgraded without
changing the assessment it came from.

::: safety_file.risk
options:
show_root_heading: true
show_source: true
heading_level: 3

## Domain objects

::: safety_file.models
options:
show_root_heading: true
show_source: false
heading_level: 3
members: - Assessment - Hazard - Mitigation - Manifest

## The repository

The only code that writes to a safety file. Every write is validated, committed,
and attributed to the person who caused it.

::: safety_file.repository
options:
show_root_heading: true
show_source: false
heading_level: 3
members: - SafetyFileRepository - slugify

## Git operations

::: safety_file.git
options:
show_root_heading: true
show_source: false
heading_level: 3

## Errors

::: safety_file.errors
options:
show_root_heading: true
show_source: false
heading_level: 3
