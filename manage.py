#!/usr/bin/env python
"""Django's command-line utility for administrative tasks.

Lives at the repository root so that both `app` (the Django project) and
`safety_file` (the storage library) are importable as siblings without any
PYTHONPATH manipulation. See ADR 0001 for why the two are kept separate.
"""

import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Could not import Django. Is it installed and is the virtual environment active?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
