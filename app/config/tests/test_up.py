"""Exercise the real launcher without starting Docker or touching a user's browser."""

from __future__ import annotations

import json
import os
import select
import shutil
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

import pytest
from django.conf import settings

DOCKER = """
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
with Path('commands.jsonl').open('a') as log:
    log.write(json.dumps([args, os.environ.get('COMPOSE_PROJECT_NAME')]) + '\\n')
if args[:2] == ['compose', 'up']:
    sys.exit(int(os.environ.get('TEST_UP_STATUS', '0')))
assert args[:2] == ['compose', 'port'], args
if os.environ.get('TEST_PORT_STATUS'):
    sys.exit(int(os.environ['TEST_PORT_STATUS']))
if 'TEST_PORT_ADDRESS' in os.environ:
    print(os.environ['TEST_PORT_ADDRESS'])
else:
    # Minimal Compose stand-in: the launcher itself must not source .env.
    values = dict(line.split('=', 1) for line in Path('.env').read_text().splitlines())
    key = 'TURVA_FRONTEND_PORT' if args[2] == 'frontend' else 'TURVA_WEB_PORT'
    port = os.environ.get(key) or values.get(key) or args[3]
    print('0.0.0.0:' + port)
"""

BROWSER = """
import json, os, sys
os.write(int(os.environ['TEST_BROWSER_FD']), json.dumps(sys.argv[1:]).encode() + b'\\n')
"""


@pytest.fixture
def launch(tmp_path: Path) -> Callable:
    root = tmp_path / "checkout"
    scripts = root / "s"
    scripts.mkdir(parents=True)
    shutil.copy2(Path(settings.BASE_DIR) / "s" / "up", scripts / "up")
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    for name, source in [
        ("docker", DOCKER),
        ("test-browser", BROWSER),
        ("uname", "print('Linux')"),
    ]:
        command = bin_dir / name
        command.write_text(f"#!{sys.executable}\n{source}")
        command.chmod(0o755)

    def run(
        *args: str, dotenv: str = "", **overrides: str
    ) -> tuple[subprocess.CompletedProcess, list, list]:
        (root / ".env").write_text(dotenv)
        read_fd, write_fd = os.pipe()
        # Do not inherit the developer's Compose project, browser or CI settings.
        environment = {
            "PATH": f"{bin_dir}:{os.defpath}",
            "HOME": str(tmp_path),
            "DISPLAY": ":test",
            "BROWSER": "test-browser",
            "COMPOSE_PROJECT_NAME": "isolated-worktree",
            "TEST_BROWSER_FD": str(write_fd),
            **overrides,
        }
        try:
            result = subprocess.run(
                ["bash", str(scripts / "up"), *args],
                cwd=tmp_path,  # The launcher must find its own checkout.
                env=environment,
                pass_fds=(write_fd,),
                capture_output=True,
                text=True,
                timeout=10,
            )
        finally:
            os.close(write_fd)
        # The opener is detached. Its inherited pipe gives deterministic completion
        # without racing a file write or sleeping to guess when it has finished.
        output = b""
        try:
            while True:
                assert select.select([read_fd], [], [], 5)[0], "Browser stub did not finish"
                data = os.read(read_fd, 4096)
                if not data:
                    break
                output += data
        finally:
            os.close(read_fd)
        browser = [json.loads(line) for line in output.splitlines()]
        commands = [json.loads(line) for line in (root / "commands.jsonl").read_text().splitlines()]
        assert all(project == "isolated-worktree" for _, project in commands)
        assert (root / ".turva-data/safety-files").is_dir()
        return result, [args for args, _ in commands], browser

    return run


def test_default_frontend(launch: Callable) -> None:
    result, commands, browser = launch("-d")
    assert result.returncode == 0
    assert commands == [
        ["compose", "up", "--detach", "--wait", "-d"],
        ["compose", "port", "frontend", "5173"],
    ]
    assert browser == [["http://localhost:5173"]]


def test_compose_dotenv_port_is_not_a_shell_variable(launch: Callable) -> None:
    result, _, browser = launch("-d", dotenv="TURVA_FRONTEND_PORT=5199\n")
    assert result.returncode == 0
    assert browser == [["http://localhost:5199"]]


def test_shell_port_override(launch: Callable) -> None:
    _, _, browser = launch("-d", dotenv="TURVA_FRONTEND_PORT=5199\n", TURVA_FRONTEND_PORT="5299")
    assert browser == [["http://localhost:5299"]]


@pytest.mark.parametrize("address", ["127.0.0.1:5311", "[::]:5311", "0.0.0.0:5311\n[::]:5311"])
def test_actual_published_port_wins_over_configured_ports(launch: Callable, address: str) -> None:
    _, _, browser = launch("-d", TURVA_FRONTEND_PORT="5299", TEST_PORT_ADDRESS=address)
    assert browser == [["http://localhost:5311"]]


def test_explicit_url_does_not_require_a_published_port(launch: Callable) -> None:
    _, commands, browser = launch(
        "-d", TURVA_URL="https://preview.example.test/path", TEST_PORT_STATUS="1"
    )
    assert len(commands) == 1
    assert browser == [["https://preview.example.test/path"]]


def test_web_only_uses_django_port(launch: Callable) -> None:
    _, commands, browser = launch("-d", "web", dotenv="TURVA_WEB_PORT=8011\n")
    assert commands[-1] == ["compose", "port", "web", "8000"]
    assert browser == [["http://localhost:8011"]]


@pytest.mark.parametrize("services", [("web", "frontend"), ("frontend", "web")])
def test_frontend_is_preferred_independent_of_argument_order(
    launch: Callable, services: tuple
) -> None:
    _, commands, browser = launch("-d", *services)
    assert commands[-1] == ["compose", "port", "frontend", "5173"]
    assert browser == [["http://localhost:5173"]]


@pytest.mark.parametrize(
    "address", ["", "unavailable", "0.0.0.0:0", "0.0.0.0:65536", "0.0.0.0:99999999999999999999"]
)
def test_invalid_port_never_opens_another_stack(launch: Callable, address: str) -> None:
    result, _, browser = launch("-d", TEST_PORT_ADDRESS=address)
    assert result.returncode == 0  # Browser discovery must not stop a healthy stack.
    assert "not opening a browser" in result.stderr
    assert browser == []


def test_missing_service_never_opens_another_stack(launch: Callable) -> None:
    result, _, browser = launch("-d", TEST_PORT_STATUS="1")
    assert result.returncode == 0
    assert "not opening a browser" in result.stderr
    assert browser == []


@pytest.mark.parametrize(
    "arguments,environment",
    [
        (("--no-browser",), {}),
        ((), {"TURVA_NO_BROWSER": "1"}),
        ((), {"CI": "true"}),
        (("postgres",), {}),
    ],
)
def test_suppression_does_not_discover_or_open_a_url(
    launch: Callable, arguments: tuple, environment: dict
) -> None:
    result, commands, browser = launch("-d", *arguments, **environment)
    assert result.returncode == 0
    assert len(commands) == 1
    assert "--no-browser" not in commands[0]
    assert browser == []


def test_failed_start_does_not_open_a_browser(launch: Callable) -> None:
    result, commands, browser = launch("-d", TEST_UP_STATUS="7")
    assert result.returncode == 7
    assert len(commands) == 1
    assert browser == []


def test_headless_run_reports_this_stacks_url(launch: Callable) -> None:
    result, _, browser = launch("-d", DISPLAY="", TEST_PORT_ADDRESS="0.0.0.0:5399")
    assert "http://localhost:5399" in result.stdout
    assert browser == []


def test_attached_run_drops_startup_only_flags(launch: Callable) -> None:
    result, commands, browser = launch("--build", "--force-recreate", "--no-browser", "web")
    assert result.returncode == 0
    assert commands == [
        ["compose", "up", "--detach", "--wait", "--build", "--force-recreate", "web"],
        ["compose", "up", "web"],
    ]
    assert browser == []
