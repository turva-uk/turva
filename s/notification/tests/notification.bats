#!/usr/bin/env bats
# Tests for notification.sh, which offers a banner saying which worktree
# has finished a response, or is waiting on a reply, and for the queue it
# writes the banner to.
#
# Ported from Quill Medical's tests, which cover the same scripts.
# Every Mac tool they reach (the notifier, osascript, ssh, code) is a stub.
#
# Each test builds a throwaway repository with one extra worktree, and
# writes to a queue in its own temporary folder, so nothing here touches
# the real repository or the real queue.

setup() {
    SCRIPT="${BATS_TEST_DIRNAME}/../notification.sh"
    QUEUE="${BATS_TEST_DIRNAME}/../notification-queue.py"
    MAIN="${BATS_TEST_TMPDIR}/turva"
    OTHER="${BATS_TEST_TMPDIR}/turva-4"

    export TURVA_NOTIFY_QUEUE="${BATS_TEST_TMPDIR}/queue/banners.jsonl"

    git init -q "$MAIN"
    git -C "$MAIN" -c user.name=t -c user.email=t@example.com \
        commit -q --allow-empty -m "start"
    git -C "$MAIN" worktree add -q "$OTHER" -b other
}

# What the script would offer for a hook payload naming this directory.
# TURVA_NOTIFY_DEBUG makes it print the banner and stop.
shown_for() {
    local cwd="$1"
    shift

    printf '{"cwd": "%s"}' "$cwd" | TURVA_NOTIFY_DEBUG=1 "$SCRIPT" "$@"
}

group_of() {
    printf '%s\n' "$1" | sed -n 's/^group=//p'
}

@test "a finished banner is grouped by its worktree" {
    run shown_for "$OTHER"

    [ "$status" -eq 0 ]
    [ "$(group_of "$output")" = "turva-claude-turva-4" ]
}

@test "two worktrees do not share a group, so neither banner replaces the other" {
    run shown_for "$MAIN"
    main_group="$(group_of "$output")"

    run shown_for "$OTHER"
    other_group="$(group_of "$output")"

    [ -n "$main_group" ]
    [ "$main_group" != "$other_group" ]
}

@test "a subdirectory of a worktree is grouped with that worktree" {
    mkdir -p "${OTHER}/frontend"

    run shown_for "${OTHER}/frontend"

    [ "$status" -eq 0 ]
    [ "$(group_of "$output")" = "turva-claude-turva-4" ]
}

@test "a question shares its worktree's group, so it replaces a finished banner" {
    run shown_for "$OTHER"
    finished_group="$(group_of "$output")"

    run shown_for "$OTHER" needs-input

    [ "$status" -eq 0 ]
    [ "$(group_of "$output")" = "$finished_group" ]
}

@test "the banner is titled with the worktree" {
    run shown_for "$OTHER"

    [ "$status" -eq 0 ]
    [[ "$output" == *"title=turva-4"* ]]
}

@test "a numbered worktree is spoken by its number, and the main checkout as one" {
    run shown_for "$OTHER"
    [[ "$output" == *"spoken=Turva 4"* ]]

    run shown_for "$MAIN"
    [[ "$output" == *"spoken=Turva one"* ]]
}

@test "the banner carries the bold lead of the closing TL;DR" {
    payload='{"cwd": "'"$OTHER"'", "last_assistant_message": "Done.\n\n## TL;DR\n\n- **Moved the scripts.** Details follow."}'

    run bash -c 'printf "%s" "$1" | TURVA_NOTIFY_DEBUG=1 "$2"' _ "$payload" "$SCRIPT"

    [ "$status" -eq 0 ]
    [[ "$output" == *"body=Moved the scripts."* ]]
}

@test "on Linux, a banner is offered as one line in the queue" {
    [ "$(uname -s)" = "Linux" ] || skip "the queue is written on the Linux dev box"

    printf '{"cwd": "%s"}' "$OTHER" | "$SCRIPT"

    [ "$(wc -l <"$TURVA_NOTIFY_QUEUE")" -eq 1 ]
    line="$(cat "$TURVA_NOTIFY_QUEUE")"
    [[ "$line" == *'"title": "turva-4"'* ]]
    [[ "$line" == *'"group": "turva-claude-turva-4"'* ]]
    [[ "$line" == *"\"cwd\": \"${OTHER}\""* ]]
}

@test "the queue is cut back once it grows long, keeping the latest banners" {
    queue="${BATS_TEST_TMPDIR}/banners.jsonl"

    for i in $(seq 1 201); do
        python3 "$QUEUE" write --queue "$queue" -- "t" "banner $i" "g" "s" "/x"
    done

    [ "$(wc -l <"$queue")" -eq 50 ]
    [[ "$(tail -n 1 "$queue")" == *'"banner 201"'* ]]
}

@test "a body starting with a dash is still written as the body" {
    queue="${BATS_TEST_TMPDIR}/banners.jsonl"

    python3 "$QUEUE" write --queue "$queue" -- "t" "-- not an option" "g" "s" "/x"

    [[ "$(cat "$queue")" == *'"body": "-- not an option"'* ]]
}

# The Mac side: showing a banner, fetching the queue, and a click.

# A stand-in for the branded notifier that records its arguments, one a line,
# so notification-show.sh can be run on any machine without posting a banner.
stub_notifier() {
    local bin="${BATS_TEST_TMPDIR}/notifier.app/Contents/MacOS"

    mkdir -p "$bin"
    cat >"${bin}/terminal-notifier" <<STUB
#!/bin/bash
printf '%s\n' "\$@" >"${BATS_TEST_TMPDIR}/notifier-args"
STUB
    chmod +x "${bin}/terminal-notifier"

    export TURVA_NOTIFY_APP="${BATS_TEST_TMPDIR}/notifier.app"
    export TURVA_NOTIFY_SPEAK=0
}

@test "the show script posts the title, body and group it is given" {
    stub_notifier
    SHOW="${BATS_TEST_DIRNAME}/../notification-show.sh"

    run "$SHOW" "turva-4" "Did the thing" "grp" "Turva 4" "$OTHER"
    [ "$status" -eq 0 ]

    args="$(cat "${BATS_TEST_TMPDIR}/notifier-args")"
    [[ "$args" == *$'-title\nturva-4'* ]]
    [[ "$args" == *$'-message\nDid the thing'* ]]
    [[ "$args" == *$'-group\ngrp'* ]]
    [[ "$args" == *"-execute"* ]]
}

# The listener's stream, as the box's tail would send it: one JSON line per
# banner, given here with the time to stamp each with.
banner_line() {
    printf '{"time": %s, "title": "%s", "body": "%s", "group": "%s", "spoken": "s", "cwd": "%s"}\n' \
        "$1" "$2" "$3" "${4:-turva-claude-turva-4}" "${5:-/home/mark/github/turva-4}"
}

# A stand-in for the show script that records each call's arguments, one a
# line, and a blank line between calls.
stub_show() {
    SHOWN="${BATS_TEST_TMPDIR}/shown"
    SHOW_STUB="${BATS_TEST_TMPDIR}/show-stub"

    cat >"$SHOW_STUB" <<STUB
#!/bin/bash
printf '%s\n' "\$@" >>"$SHOWN"
printf '\n' >>"$SHOWN"
STUB
    chmod +x "$SHOW_STUB"
}

listen() {
    python3 "${BATS_TEST_DIRNAME}/../notification-queue.py" show \
        --show-script "$SHOW_STUB" --box devbox \
        --state "${BATS_TEST_TMPDIR}/last-shown"
}

@test "the Mac shows a fresh banner, naming the box so a click finds its window" {
    stub_show
    now="$(date +%s)"

    banner_line "$now" "turva-4" "Did the thing" | listen

    [ "$(cat "$SHOWN")" = $'turva-4\nDid the thing\nturva-claude-turva-4\ns\n/home/mark/github/turva-4\ndevbox' ]
}

@test "the Mac skips a banner older than five minutes" {
    stub_show
    old="$(( $(date +%s) - 600 ))"

    banner_line "$old" "turva-4" "Long ago" | listen

    [ ! -e "$SHOWN" ]
}

@test "after a reconnect, the Mac does not show a banner twice" {
    stub_show
    now="$(date +%s)"

    banner_line "$now" "turva-4" "Once" | listen
    banner_line "$now" "turva-4" "Once" | listen

    [ "$(grep -c '^Once$' "$SHOWN")" -eq 1 ]
}

@test "the Mac ignores a line that is not a banner, and shows the next" {
    stub_show
    now="$(date +%s)"

    {
        printf 'not json at all\n'
        printf '{"time": %s, "title": ["a list"]}\n' "$now"
        banner_line "$now" "turva-4" "Bad group" 'bad; rm -rf ~'
        banner_line "$now" "turva-4" "Good one"
    } | listen

    [ "$(grep -c '^devbox$' "$SHOWN")" -eq 1 ]
    grep -q '^Good one$' "$SHOWN"
}

@test "the Mac drops a worktree path that does not look like one, but still shows the banner" {
    stub_show
    now="$(date +%s)"

    banner_line "$now" "turva-4" "Odd path" \
        turva-claude-turva-4 '/home/../etc$(touch x)' | listen

    grep -q '^Odd path$' "$SHOWN"
    [ "$(grep -c 'etc' "$SHOWN")" -eq 0 ]
}

@test "the Mac turns control characters in a banner into spaces" {
    stub_show
    now="$(date +%s)"

    printf '{"time": %s, "title": "a\\nb", "body": "c\\u001bd", "group": "g", "spoken": "s", "cwd": "/x"}\n' \
        "$now" | listen

    grep -q '^a b$' "$SHOWN"
    grep -q '^c d$' "$SHOWN"
}

# say, terminal-notifier and the like read an argument starting with a dash
# as an option, so `say -v Karen "-o ~/file"` would write over a file on the
# Mac. Text from the box must never reach them starting with one.
@test "the Mac never passes a text field that starts with a dash" {
    stub_show
    now="$(date +%s)"

    printf '{"time": %s, "title": "-title", "body": "--help", "group": "g", "spoken": "-o /tmp/x", "cwd": "/x"}\n' \
        "$now" | listen

    [ "$(grep -c '^-' "$SHOWN")" -eq 0 ]
    grep -q '^ -o /tmp/x$' "$SHOWN"
}

@test "the Mac ignores a banner whose group starts with a dash" {
    stub_show
    now="$(date +%s)"

    banner_line "$now" "turva-4" "Dash group" "-execute" | listen

    [ ! -e "$SHOWN" ]
}

# Stand-ins for ssh and setsid, first on PATH, which record that ssh was
# called, for the box's side, or replay a queue, for the Mac's.
stub_ssh() {
    local bin="${BATS_TEST_TMPDIR}/bin"

    mkdir -p "$bin"
    cat >"${bin}/ssh" <<STUB
#!/bin/bash
printf '%s\n' "\$@" >"${BATS_TEST_TMPDIR}/ssh-called"
cat "${BATS_TEST_TMPDIR}/remote-queue" 2>/dev/null
STUB
    cat >"${bin}/setsid" <<'STUB'
#!/bin/bash
[ "$1" = "-f" ] && shift
exec "$@"
STUB
    chmod +x "${bin}/ssh" "${bin}/setsid"

    export PATH="${bin}:${PATH}"
}

@test "the listener connects to the box, follows its queue, and shows what arrives" {
    stub_ssh
    stub_notifier
    banner_line "$(date +%s)" "turva-4" "From the box" \
        >"${BATS_TEST_TMPDIR}/remote-queue"
    export HOME="${BATS_TEST_TMPDIR}/home"

    TURVA_NOTIFY_ONCE=1 run "${BATS_TEST_DIRNAME}/../notification-listen.sh"
    [ "$status" -eq 0 ]

    ssh_args="$(cat "${BATS_TEST_TMPDIR}/ssh-called")"
    [[ "$ssh_args" == *$'BatchMode=yes'* ]]
    [[ "$ssh_args" == *$'\ndevbox\n'* ]]
    [[ "$ssh_args" == *'tail -n 20 -F "$HOME/.local/state/quill-notify/banners.jsonl"'* ]]

    args="$(cat "${BATS_TEST_TMPDIR}/notifier-args")"
    [[ "$args" == *$'-message\nFrom the box'* ]]
    [[ "$args" == *"'/home/mark/github/turva-4' 'devbox'"* ]]
}

# A stand-in for osascript that records the window title it was asked to
# find, and finds it only if told to.
stub_focus_tools() {
    local bin="${BATS_TEST_TMPDIR}/bin"

    mkdir -p "$bin"
    cat >"${bin}/osascript" <<STUB
#!/bin/bash
printf '%s\n' "\$2" >"${BATS_TEST_TMPDIR}/osascript-name"
exit "\${OSASCRIPT_STATUS:-1}"
STUB
    cat >"${bin}/code" <<STUB
#!/bin/bash
printf '%s\n' "\$@" >"${BATS_TEST_TMPDIR}/code-args"
STUB
    chmod +x "${bin}/osascript" "${bin}/code"

    export PATH="${bin}:${PATH}"
    export TURVA_NOTIFY_CODE="${bin}/code"
}

@test "for the box, the click looks for the window titled with [SSH: devbox]" {
    stub_focus_tools
    FOCUS="${BATS_TEST_DIRNAME}/../notification-focus.sh"

    OSASCRIPT_STATUS=0 run "$FOCUS" /home/mark/github/turva-5 devbox
    [ "$status" -eq 0 ]
    [ "$(cat "${BATS_TEST_TMPDIR}/osascript-name")" = "turva-5 [SSH: devbox]" ]
    [ ! -e "${BATS_TEST_TMPDIR}/code-args" ]
}

@test "for the box, with no window in view, the click opens the folder over SSH" {
    stub_focus_tools
    FOCUS="${BATS_TEST_DIRNAME}/../notification-focus.sh"

    run "$FOCUS" /home/mark/github/turva-5 devbox
    [ "$status" -eq 0 ]
    [ "$(cat "${BATS_TEST_TMPDIR}/code-args")" = $'--folder-uri\nvscode-remote://ssh-remote+devbox/home/mark/github/turva-5' ]
}
