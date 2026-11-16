#!/bin/bash

# Show the Linux dev box's banners on the Mac, by fetching them.
#
# The box has no screen, so notification.sh there only offers each banner,
# as a JSON line in a queue file. This runs on the Mac, under the launchd
# agent `just notify-listen-install` sets up: it holds one SSH connection to
# the box, follows the queue with `tail -F`, and shows each banner with the
# Mac's own notification-show.sh. So the box never connects to the Mac, and
# what it sends is text, which notification-queue.py checks, never code.
#
# Nothing polls: a banner arrives as soon as it is written. When the
# connection drops, after sleep or a change of network, it tries again
# every TURVA_NOTIFY_RETRY seconds. tail starts each connection with the
# last few lines, so a banner written while the Mac was away still shows if
# it is recent; the queue helper skips anything already shown or too old.
#
# TURVA_NOTIFY_BOX is the box as the Mac's ssh knows it, and as VS Code
# titles its windows: "devbox" unless set.
#
# The Mac's bash is 3.2, so nothing newer than that is used here.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BOX="${TURVA_NOTIFY_BOX:-devbox}"
RETRY="${TURVA_NOTIFY_RETRY:-10}"
SSH="${TURVA_NOTIFY_SSH:-ssh}"

# Single-quoted so the box's shell, not this one, expands $HOME. The queue
# is shared with Quill Medical, whose hook writes to the same file, so this
# one listener shows both repositories' banners.
REMOTE='tail -n 20 -F "$HOME/.local/state/quill-notify/banners.jsonl" 2>/dev/null'

# ServerAlive notices a dead connection, such as one left over from before
# a sleep, within about 45 seconds instead of never. BatchMode means a
# connection that would need a password fails rather than waits.
while true; do
    "$SSH" -o BatchMode=yes -o ConnectTimeout=10 \
        -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
        "$BOX" "$REMOTE" \
        | python3 "$SCRIPT_DIR/notification-queue.py" show \
            --show-script "$SCRIPT_DIR/notification-show.sh" --box "$BOX"

    [ "${TURVA_NOTIFY_ONCE:-0}" = "1" ] && exit 0
    sleep "$RETRY"
done
