#!/bin/bash

# Claude Code hook: offer a banner saying which worktree just finished.
#
# With "needs-input" as its argument it says instead that Claude is waiting
# for a reply: a question from AskUserQuestion (PreToolUse hook) or a
# permission prompt (Notification hook). A question modal gives no signal of
# its own in VS Code, so a turn could sit blocked on one unnoticed.
#
# Claude Code runs this when a response completes, passing the hook payload as
# JSON on stdin. We read `cwd` from that payload - it follows Claude into the
# worktree, whereas $CLAUDE_PROJECT_DIR stays at the session's start directory.
#
# On a Mac, notification-show.sh shows the banner directly. On a headless
# Linux box reached over VS Code Remote-SSH, the screen being watched is the
# Mac's, so the box only offers the banner, as a line in a queue file, and
# notification-listen.sh on the Mac fetches it over a connection the Mac
# opens. The box never connects to the Mac. See notification-queue.py, and
# README.md beside this script for setting up the Mac.
#
# A notification that cannot be offered is never worth failing a response
# over, so this always exits 0.

set -u

MODE="${1:-finished}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Read the hook payload, if there is one. Extract `cwd` without assuming jq is
# installed; fall back to the current directory when stdin is empty or odd.
payload=""
if [ ! -t 0 ]; then
    payload="$(cat 2>/dev/null || true)"
fi

cwd=""
if [ -n "$payload" ]; then
    cwd="$(printf '%s' "$payload" \
        | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
        | head -n 1)"
fi
[ -n "$cwd" ] || cwd="$PWD"

# `cwd` also follows Claude into a subdirectory after a `cd frontend`, and
# the banner would then be titled "frontend", spoken as "frontend", and a
# click would open that folder over the worktree's window. Climb back to the
# worktree root; outside a repository the directory stands as it is.
root="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$root" ] && cwd="$root"

worktree="$(basename "$cwd")"
branch="$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

# What the turn actually did, taken from `last_assistant_message` in the
# payload. The first bullet of the closing TL;DR is written to carry the
# result on its own, so its bold lead makes a better banner line than the
# branch name: "Wired the notifier into the Stop hook" rather than
# "finished on
# feature/practising-stop-the-card-asking-forever".
#
# Python rather than sed: the field is long, multiline and JSON-escaped, and
# a regex over it goes wrong quietly. Any failure leaves $summary empty and
# the branch line stands in, so a banner is never lost to a parse error.
summary=""
summary_flag=""
[ "$MODE" = "needs-input" ] && summary_flag="--input"
if [ -n "$payload" ] && command -v python3 >/dev/null 2>&1; then
    summary="$(printf '%s' "$payload" \
        | python3 "$SCRIPT_DIR/notification-summary.py" ${summary_flag:+"$summary_flag"} \
            2>/dev/null || true)"
fi

if [ "$MODE" = "needs-input" ]; then
    title="$worktree"
    body="${summary:-Claude is waiting for your reply}"
else
    title="$worktree"
    if [ -n "$summary" ]; then
        body="$summary"
    elif [ -n "$branch" ]; then
        body="Claude finished on $branch"
    else
        body="Claude finished"
    fi
fi

# macOS keeps one banner per group, a new one replacing the last. The
# worktree is the group, so each worktree keeps one banner, its latest: two
# worktrees finishing while nobody is looking leave two banners, and one
# worktree finishing twice leaves one. A question shares the group with a
# finished turn. Mark asked for that on 27 October 2026, after the two kinds
# had been kept apart and piled up for the same worktree.
group="turva-claude-$worktree"

# Spoken phrase. Directory names like "turva-4" read poorly aloud, so speak
# the trailing number on its own ("Turva 4"); the main checkout has no suffix
# and becomes "Turva one".
case "$worktree" in
    *-[0-9]*) spoken="Turva ${worktree##*-}" ;;
    turva) spoken="Turva one" ;;
    *) spoken="$worktree" ;;
esac

# Set TURVA_NOTIFY_DEBUG=1 to print what would be shown and stop; used by
# the tests, and handy when a banner is not saying what you expected.
if [ "${TURVA_NOTIFY_DEBUG:-0}" = "1" ]; then
    printf 'title=%s\nbody=%s\ngroup=%s\nspoken=%s\n' "$title" "$body" "$group" "$spoken"
    exit 0
fi

case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin)
        # Claude is running on the Mac itself, so show the banner here.
        "$SCRIPT_DIR/notification-show.sh" \
            "$title" "$body" "$group" "$spoken" "$cwd" \
            >/dev/null 2>&1 || true
        ;;
    Linux)
        # The headless box: offer the banner for the Mac to fetch.
        if command -v python3 >/dev/null 2>&1; then
            python3 "$SCRIPT_DIR/notification-queue.py" write -- \
                "$title" "$body" "$group" "$spoken" "$cwd" \
                >/dev/null 2>&1 || true
        fi
        ;;
    *)
        # Unknown platform: stay silent rather than emit noise on every response.
        ;;
esac

exit 0
