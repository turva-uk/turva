#!/usr/bin/env python3

"""Summarise a Claude turn into one line for the Stop-hook banner.

Reads the hook payload on stdin and prints a single line to stdout, or
nothing when there is no usable summary; the caller then falls back to
naming the branch. Never fails: a banner is worth more than a perfect
summary, so every error path prints nothing and exits zero.

The closing TL;DR is the source. Its first bullet is written to carry the
result on its own, and a bold lead opens it, so that lead is the summary.
"""

from __future__ import annotations

import json
import re
import sys

MAX_LEN = 120


def _first_tldr_bullet(lines: list[str]) -> str:
    """The first bullet beneath a TL;DR heading, or an empty string."""
    start = None

    for i, line in enumerate(lines):
        if re.match(r"^#{1,6}\s*TL;DR", line, re.IGNORECASE):
            start = i
            break
    if start is None:
        return ""

    for line in lines[start + 1 :]:
        stripped = line.strip()
        if stripped.startswith(("-", "*")):
            # Exactly one bullet marker: lstrip("-* ") would eat the
            # asterisks of a "**bold lead**" too, and the lead is the part
            # worth keeping.
            return re.sub(r"^[-*]\s+", "", stripped).strip()

    return ""


def _first_prose_line(lines: list[str]) -> str:
    """The first ordinary sentence, skipping structure and code."""
    in_fence = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence or not stripped:
            continue
        if stripped.startswith(("#", "-", "*", ">", "|")):
            continue
        return stripped

    return ""


def _strip_markdown(text: str) -> str:
    """Flatten what a notification banner would otherwise show literally."""
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)  # links
    text = re.sub(r"[*_`]", "", text)
    # A markdown-escaped character ("\_", "\*") keeps only the character.
    text = re.sub(r"\\(.)", r"\1", text)

    return " ".join(text.split())


def summarise(message: str) -> str:
    """The one line a banner shows for a finished turn, or an empty string."""
    lines = message.splitlines()
    candidate = _first_tldr_bullet(lines) or _first_prose_line(lines)

    if not candidate:
        return ""

    # "**Did the thing.** Detail follows." The lead is the summary and the
    # detail is what the TL;DR expects a reader to skip.
    bold = re.match(r"\*\*(.+?)\*\*", candidate)

    if bold:
        candidate = bold.group(1)

    candidate = _strip_markdown(candidate)

    if len(candidate) > MAX_LEN:
        candidate = candidate[: MAX_LEN - 1].rstrip() + "…"

    return candidate


def summarise_input(payload: dict[str, object]) -> str:
    """What Claude is waiting on, for the banner when it needs a reply.

    Two hook payloads reach here. A PreToolUse hook on AskUserQuestion
    carries the question in tool_input; a Notification hook for a
    permission prompt carries Claude Code's own sentence in "message",
    such as "Claude needs your permission to use Bash".
    """
    tool_input = payload.get("tool_input")
    questions = tool_input.get("questions") if isinstance(tool_input, dict) else None

    text: object = ""
    if isinstance(questions, list) and questions and isinstance(questions[0], dict):
        text = questions[0].get("question") or ""
    else:
        text = payload.get("message") or ""

    if not isinstance(text, str):
        return ""

    text = _strip_markdown(text)

    if len(text) > MAX_LEN:
        text = text[: MAX_LEN - 1].rstrip() + "…"

    return text


def main() -> int:
    # "--input" summarises what Claude is waiting on rather than what it
    # finished; see summarise_input.
    waiting = "--input" in sys.argv[1:]

    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            return 0

        if waiting:
            summary = summarise_input(payload)
        else:
            message = payload.get("last_assistant_message") or ""
            summary = summarise(message) if isinstance(message, str) else ""
        if summary:
            print(summary)
    except ValueError, OSError:
        pass  # No summary is a fine outcome; the caller names the branch.

    return 0


if __name__ == "__main__":
    sys.exit(main())
