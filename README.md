# Turva

**Clinical safety documentation brought into the 21st Century** <!-- markdownlint-disable-line MD036 -->

Clinical Safety is a laborious, dull and slow process. On the other side of this, clinical safety is paramount to ensure that harm does not come to the patients that we look after. In other industries great harm can come from this combination of dull but safety critical processes. Just look at the aviation industry, where the dull but critical processes of flight safety checks and maintenance are now supported by digital systems that ensure compliance and safety. Turva has taken the task of planning, documenting and managing clinical safety and made it a digital process that is easy to use, quick to complete and ensures that the documentation is always up to date and compliant with the latest standards.

## Features

The underlying technology of Turva is designed to be interoperable, fast, automate where possible and to be easy to use. Turva is built on the VMPT technological stack:

- V: version control
- M: markdown
- P: placeholders
- T: templates

On top of the VMPT stack, Turva enables the clinical safety officer and team to import safety case templates, search and import safety cases from other projects, create a clear and well defined sign off process.

## Technological stack

- React frontend with TypeScript
- Mantine UI components
- NGINX reverse proxy
- Gunicorn WSGI server
- FastAPI web framework
- PostgreSQL database
- VMPT

## The backstory

The Turva platform has been in the making for some time. The original work is in many ways thanks to Dr Marcus Baw, when he created the [dcb-0129-cookiecutter](https://github.com/digital-clinical-safety-alliance/dcb0129-mkdocs-template) in July 2022. Joe Channing then added his wisdom to the pool when he completed his dissertation of clinical safety in code titled **DevSecRegOps: A framework for aiding security and compliance in modern healthcare software development** in May 2023. Dr Mark Bailey took the learnings from both Marcus and Joe and created the Digital Clinical Safety Platform (DCSP). The DCSP is a prototype, built back in November 2023. We gave a webinar back in September 2024, and had a lot of interest regarding the platform. We are now building out the DCSP as a production level platform, but felt the DCSP name was too long, does not slip off the tongue and not very catchy. We have decided on the name **Turva**.

## What is in a name?

The Turva team is:

- Dr Marcus Baw
- Joe Channing
- Dr Mark Bailey
- Dr Grant Vallance
- Nadia Kuftinoff

We all met in Finland at Mark's parents summer house in July 2025. We were looking for a replacement for the Digital Clinical Safety Platform name. It seemed that all of the safety related English names and words had been taken. Then we looked at names and words from other countries. The word for safety in Finnish is **turva**. Turva seemed a great name, short, easy to say ("toor-va") and nodes at Finland as the origin story for the enterprise ready platform.