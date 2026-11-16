#!/usr/bin/env python3

"""Hand banners from the Linux dev box to the Mac, as data and never as code.

The box has no screen, so its banners have to be shown on the Mac. The box
offers them and the Mac fetches them, so the box never connects to the Mac:

    write   on the box: append one banner, as a JSON line, to the queue file.
    show    on the Mac: read JSON lines on stdin, the queue file streamed by
            `tail -F` over SSH, and show each with notification-show.sh.

Everything read in `show` came from another machine, so it is treated as
text: each field is checked and passed to the show script as an argument,
never through a shell. A line that is not a banner is ignored.

The queue file is shared with Quill Medical, which has the same scripts:
both repositories' hooks write to it, and one listener on the Mac shows the
banners of both. The line format is therefore shared too, and changes here
only alongside the same change there.

Never fails a caller. `write` runs inside a Claude Code hook, where a banner
lost is better than a turn held up, so every error path exits zero.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

# Shared with Quill Medical; see the module docstring.
DEFAULT_QUEUE = "~/.local/state/quill-notify/banners.jsonl"

# The queue is cut back to KEEP lines once it passes MAX_LINES, so it never
# grows, and a reconnecting Mac still finds the last few banners.
MAX_LINES = 200
KEEP = 50

# A banner older than this when the Mac reads it is skipped, so opening the
# lid after an hour does not replay the hour.
MAX_AGE_SECONDS = 300

FIELD_LIMITS = {"title": 100, "body": 300, "spoken": 100}

# Neither may start with a dash, which the programs they reach on the Mac
# would read as an option.
GROUP_PATTERN = re.compile(r"^[A-Za-z0-9._][A-Za-z0-9._-]{0,99}$")
PATH_PATTERN = re.compile(r"^/[A-Za-z0-9._/-]{0,300}$")
BOX_PATTERN = re.compile(r"^[A-Za-z0-9._][A-Za-z0-9._-]{0,99}$")
CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")

Banner = dict[str, str | float]


def queue_path(value: str | None) -> Path:
    """The queue file, from --queue, TURVA_NOTIFY_QUEUE or the default."""
    raw = value or os.environ.get("TURVA_NOTIFY_QUEUE") or DEFAULT_QUEUE

    return Path(raw).expanduser()


def write_banner(
    queue: Path,
    title: str,
    body: str,
    group: str,
    spoken: str,
    cwd: str,
    now: float | None = None,
) -> None:
    """Append one banner to the queue, trimming the queue when it is long.

    The lock keeps two worktrees finishing at once from interleaving a
    line, or from one trimming while the other appends. Quill Medical's
    writer takes the same lock on the same file.
    """
    banner: Banner = {
        "time": time.time() if now is None else now,
        "title": title,
        "body": body,
        "group": group,
        "spoken": spoken,
        "cwd": cwd,
    }
    line = json.dumps(banner, ensure_ascii=True) + "\n"

    queue.parent.mkdir(parents=True, exist_ok=True)

    with queue.open("a+", encoding="utf-8") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        handle.write(line)
        handle.flush()

        handle.seek(0)
        lines = handle.readlines()
        if len(lines) > MAX_LINES:
            handle.seek(0)
            handle.truncate()
            handle.writelines(lines[-KEEP:])

        fcntl.flock(handle, fcntl.LOCK_UN)


def _clean(value: object, limit: int) -> str | None:
    """A field as one line of plain text, or None when it is not text.

    A leading dash gets a space before it: `say`, which speaks the spoken
    field, and terminal-notifier read an argument starting with one as an
    option, and `say -o <file>` writes over a file on the Mac.
    """
    if not isinstance(value, str):
        return None

    text = CONTROL_CHARACTERS.sub(" ", value)[:limit]
    if text.startswith("-"):
        text = " " + text

    return text


def parse_banner(line: str) -> Banner | None:
    """One queue line as a checked banner, or None if it is not one.

    A worktree path that does not look like one is dropped rather than the
    whole banner: the banner still shows, and a click does nothing.
    """
    try:
        data = json.loads(line)
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None

    stamp = data.get("time")
    if not isinstance(stamp, (int, float)) or isinstance(stamp, bool):
        return None

    banner: Banner = {"time": float(stamp)}

    for field, limit in FIELD_LIMITS.items():
        cleaned = _clean(data.get(field), limit)
        if cleaned is None:
            return None
        banner[field] = cleaned

    group = data.get("group")
    if not isinstance(group, str) or not GROUP_PATTERN.match(group):
        return None
    banner["group"] = group

    cwd = data.get("cwd")
    if isinstance(cwd, str) and PATH_PATTERN.match(cwd) and ".." not in cwd:
        banner["cwd"] = cwd
    else:
        banner["cwd"] = ""

    return banner


def _read_last_shown(state: Path) -> float:
    try:
        return float(state.read_text(encoding="utf-8").strip())
    except OSError, ValueError:
        return 0.0


def _write_last_shown(state: Path, stamp: float) -> None:
    try:
        state.parent.mkdir(parents=True, exist_ok=True)
        state.write_text(repr(stamp), encoding="utf-8")
    except OSError:
        pass


def show_banners(show_script: str, box: str, state: Path) -> None:
    """Show every new banner arriving on stdin, until the stream ends.

    The time of the last banner shown is kept in `state`, so a reconnect,
    which `tail` begins with the last few lines, shows nothing twice.
    """
    last_shown = _read_last_shown(state)

    for line in iter(sys.stdin.readline, ""):
        banner = parse_banner(line)
        if banner is None:
            continue

        stamp = float(banner["time"])
        if stamp <= last_shown or time.time() - stamp > MAX_AGE_SECONDS:
            continue

        last_shown = stamp
        _write_last_shown(state, stamp)

        arguments = [str(banner[field]) for field in ("title", "body", "group", "spoken", "cwd")]
        try:
            subprocess.run(
                [show_script, *arguments, box],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
                timeout=60,
            )
        except OSError, subprocess.SubprocessError:
            pass


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    write = commands.add_parser("write", help="append one banner (the box)")
    write.add_argument("--queue")
    for field in ("title", "body", "group", "spoken", "cwd"):
        write.add_argument(field)

    show = commands.add_parser("show", help="show banners on stdin (the Mac)")
    show.add_argument("--show-script", required=True)
    show.add_argument("--box", default="devbox")
    show.add_argument(
        "--state",
        default="~/Library/Caches/turva-notifier/last-shown",
    )

    args = parser.parse_args(argv)

    if args.command == "write":
        try:
            write_banner(
                queue_path(args.queue),
                args.title,
                args.body,
                args.group,
                args.spoken,
                args.cwd,
            )
        except OSError:
            pass

        return 0

    if not BOX_PATTERN.match(args.box):
        return 0

    show_banners(args.show_script, args.box, Path(args.state).expanduser())

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
