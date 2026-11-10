"""Read local console email without printing bearer links into terminal output.

Only the developer's own DEBUG stack with the console mail backend is in scope.
The decoded message stays in the gitignored private workspace, never in a site.
"""

from __future__ import annotations

import argparse
import html
import re
import subprocess
import webbrowser
from email import policy
from email.message import EmailMessage
from email.parser import Parser
from pathlib import Path


def latest_message(logs: str) -> EmailMessage:
    # Both account flows send multipart/alternative messages. Looking for the
    # outer header, not text/plain parts, avoids parsing an inner MIME part as
    # if it were the email. The parser decodes quoted-printable soft line breaks.
    starts = list(re.finditer(r"(?m)^Content-Type: multipart/alternative;", logs))
    if not starts:
        raise ValueError("No account email found. Trigger one in the interface, then try again.")
    start = starts[-1].start()
    # Header order is not fixed: Subject/To may precede Content-Type.
    for line in reversed(logs[:start].splitlines(keepends=True)):
        if re.match(r"^[A-Za-z0-9-]+:", line) or line.startswith((" ", "\t")):
            start -= len(line)
        else:
            break
    return Parser(policy=policy.default).parsestr(logs[start:])


def preview_html(message: EmailMessage) -> str:
    part = message.get_body(preferencelist=("plain",))
    if part is None:
        raise ValueError("This message has no plain-text body to preview.")
    body = part.get_content()
    pieces = re.split(r"(https?://[^\s<>]+)", body)
    rendered = "".join(
        f'<a href="{html.escape(piece, quote=True)}" rel="noreferrer">{html.escape(piece)}</a>'
        if piece.startswith(("http://", "https://"))
        else html.escape(piece)
        for piece in pieces
    )
    return (
        '<!doctype html><html lang="en-GB"><meta charset="utf-8">'
        '<meta name="referrer" content="no-referrer">'
        '<meta http-equiv="Content-Security-Policy" '
        'content="default-src &#39;none&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'
        "<title>Turva development email</title>"
        "<h1>Development email - local only</h1>"
        f"<h2>{html.escape(str(message.get('Subject', 'Account email')))}</h2>"
        f"<p>To: {html.escape(str(message.get('To', '')))}</p><pre>{rendered}</pre></html>"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--open", action="store_true", help="Open the private HTML preview.")
    parser.add_argument(
        "--since", default="30m", help="Read console logs since this time (default: 30m)."
    )
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    guard = (
        "import django; django.setup(); from django.conf import settings; "
        "import sys; sys.exit(0 if settings.DEBUG and "
        "settings.MAILERS['default']['BACKEND'] == "
        "'django.core.mail.backends.console.EmailBackend' else "
        "'Email preview is only available with DEBUG=true and the console email backend.')"
    )
    try:
        subprocess.run(
            ["docker", "compose", "exec", "-T", "web", "python", "-c", guard], cwd=root, check=True
        )
        logs = subprocess.check_output(
            [
                "docker",
                "compose",
                "logs",
                "--no-color",
                "--no-log-prefix",
                "--since",
                args.since,
                "web",
            ],
            cwd=root,
            text=True,
        )
        content = preview_html(latest_message(logs))
    except (OSError, subprocess.CalledProcessError, ValueError) as exc:
        parser.exit(
            1,
            f"Could not preview development email: {exc}\nStart the stack with ./s/up and request an account email first.\n",
        )
    directory = root / ".private" / "mail"
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    preview = directory / "latest.html"
    preview.write_text(content, encoding="utf-8")
    preview.chmod(0o600)
    print(
        f"Development email saved to {preview}. It may contain a single-use account link; do not share it."
    )
    if args.open:
        webbrowser.open(preview.as_uri())


if __name__ == "__main__":
    main()
