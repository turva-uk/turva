"""The dev stack can run once per worktree.

Two git worktrees each run `./s/up` while a stacked change is being built in
one of them. Docker allows one container per name on a machine, and one
process per published port, so a fixed `container_name` or a fixed host port
stops the second stack from starting. Its Django suite then cannot run at all.

These tests read `docker-compose.yml` and hold it to the two rules that keep a
second stack possible.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pytest
import yaml
from django.conf import settings

COMPOSE_FILE = Path(settings.BASE_DIR) / "docker-compose.yml"

#: `${TURVA_SOMETHING_PORT:-1234}:5678`, optionally with a protocol suffix.
PORT_FROM_ENVIRONMENT = re.compile(
    r"^\$\{TURVA_[A-Z]+_PORT:-\d+\}:\d+(/(tcp|udp))?$",
)


def load_services() -> dict[str, dict[str, Any]]:
    """The `services` mapping from the compose file."""
    data = yaml.safe_load(COMPOSE_FILE.read_text())
    services = data["services"]
    assert isinstance(services, dict)

    return services


def published_ports() -> list[tuple[str, str]]:
    """Each `(service, port mapping)` the compose file publishes."""
    found: list[tuple[str, str]] = []

    for name, service in load_services().items():
        for port in service.get("ports", []):
            found.append((name, str(port)))

    return found


def test_no_service_fixes_its_container_name() -> None:
    fixed = [name for name, service in load_services().items() if "container_name" in service]

    assert fixed == []


@pytest.mark.parametrize(("service", "port"), published_ports())
def test_every_published_port_reads_the_environment(service: str, port: str) -> None:
    assert PORT_FROM_ENVIRONMENT.match(port), f"{service} publishes {port!r}"


def test_each_port_has_its_own_variable() -> None:
    variables = [re.findall(r"TURVA_[A-Z]+_PORT", port) for _, port in published_ports()]
    names = [found[0] for found in variables if found]

    assert len(names) == len(set(names))


def test_the_default_ports_are_unchanged() -> None:
    """The main checkout keeps the addresses everyone already uses."""
    defaults = {
        re.sub(r"^\$\{(TURVA_[A-Z]+_PORT):-(\d+)\}.*$", r"\1", port): re.sub(
            r"^\$\{TURVA_[A-Z]+_PORT:-(\d+)\}.*$", r"\1", port
        )
        for _, port in published_ports()
    }

    assert defaults == {
        "TURVA_WEB_PORT": "8000",
        "TURVA_FRONTEND_PORT": "5173",
        "TURVA_HTTP_PORT": "80",
        "TURVA_HTTPS_PORT": "443",
        "TURVA_POSTGRES_PORT": "5433",
    }
