"""The development helper decodes real MIME, but never interprets email HTML."""

import subprocess
import sys
from email.message import EmailMessage

import pytest

from demo.console_email import latest_message, main, preview_html


def example(subject: str) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["To"] = "fictional@example.org"
    message.set_content(
        "Follow https://turva.example.org/accounts/verify/fictional/"
        + "example-token-" * 12
        + "/\n<script>not markup</script>",
        cte="quoted-printable",
    )
    message.add_alternative("<p>Unused HTML part</p>", subtype="html")
    return message


def test_decodes_soft_wrapped_links_and_selects_the_latest_email():
    first, second = example("First email"), example("Second email")
    logs = first.as_string() + "\nHTTP request log\n" + second.as_string()
    parsed = latest_message(logs)
    assert parsed["Subject"] == "Second email"
    rendered = preview_html(parsed)
    assert "example-token-" * 12 in rendered
    assert "=\n" not in rendered
    assert "<script>" not in rendered
    assert "&lt;script&gt;" in rendered
    assert "Unused HTML part" not in rendered
    assert "noreferrer" in rendered


def test_does_not_present_an_empty_log_as_delivered_email():
    with pytest.raises(ValueError, match="No account email found"):
        latest_message("Only web request logs, no email.")


def test_failed_development_guard_stops_before_reading_logs(monkeypatch):
    def refuse(command, **kwargs):
        assert "settings.DEBUG" in command[-1]
        assert "console.EmailBackend" in command[-1]
        raise subprocess.CalledProcessError(1, command)

    def must_not_read(*args, **kwargs):
        pytest.fail("Logs were read after the development guard refused access")

    monkeypatch.setattr(sys, "argv", ["s/mail"])
    monkeypatch.setattr(subprocess, "run", refuse)
    monkeypatch.setattr(subprocess, "check_output", must_not_read)
    with pytest.raises(SystemExit) as failure:
        main()
    assert failure.value.code == 1
