#!/bin/bash

# Install the banner listener on the Mac, as a launchd agent.
#
# Copies the listener and the scripts it calls out of this checkout into
# ~/Library/Application Support/turva-notify, so the Mac's banners do not
# change with whichever branch the checkout happens to be on, then loads an
# agent that starts the listener at login and restarts it if it stops.
# Run it again to pick up a change to the scripts.
#
# TURVA_NOTIFY_BOX, if set, is written into the agent, for a box the Mac's
# ssh knows by a name other than "devbox".
#
# Quill Medical has the same listener, reading the same queue on the box.
# Two listeners would show every banner twice, so this stops if Quill's is
# already installed: that one shows Turva's banners as it is.

set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
    echo "The banner listener runs on the Mac; nothing to install here."
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEL="com.turva.notify-listen"
DEST="$HOME/Library/Application Support/turva-notify"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/turva-notify-listen.log"
QUILL_LABEL="com.quill-medical.notify-listen"
BOX="${TURVA_NOTIFY_BOX:-devbox}"

if launchctl print "gui/$(id -u)/$QUILL_LABEL" >/dev/null 2>&1; then
    echo "Quill Medical's banner listener is already running, and it reads the"
    echo "same queue, so it shows Turva's banners too. Nothing to install."
    exit 0
fi

mkdir -p "$DEST" "$(dirname "$PLIST")" "$(dirname "$LOG")"

for file in notification-listen.sh notification-queue.py \
    notification-show.sh notification-focus.sh level-completed.mp3; do
    cp "$SCRIPT_DIR/$file" "$DEST/$file"
done

chmod +x "$DEST/notification-listen.sh" "$DEST/notification-show.sh" \
    "$DEST/notification-focus.sh"

# launchd starts agents with almost no PATH; Homebrew's is added for a
# python3 or ssh installed there.
cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$DEST/notification-listen.sh</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>TURVA_NOTIFY_BOX</key>
        <string>$BOX</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>$LOG</string>
</dict>
</plist>
PLIST

# bootout fails when the agent is not loaded yet, which is the first run.
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "Banner listener installed and running, fetching from $BOX."
echo "Its errors go to $LOG."
