#!/usr/bin/env bats
# Tests for vscode-code.sh, which runs VS Code's `code` for the window the
# terminal belongs to, borrowing the hook and the remote CLI from the tmux
# client when the shell is inside tmux.
#
# tmux is a stub that names a client process, /proc is a folder of the
# test's own through PROC_ROOT, and the remote CLI's `code` is a stub that
# records the hook it was given and its arguments. A second stub `code`
# stands for the standalone CLI installed on the box.

setup() {
    SCRIPT="${BATS_TEST_DIRNAME}/../vscode-code.sh"
    CALLS="${BATS_TEST_TMPDIR}/calls"
    REMOTE_CLI="${BATS_TEST_TMPDIR}/server/bin/remote-cli"
    LOCAL_BIN="${BATS_TEST_TMPDIR}/local-bin"
    unset TMUX VSCODE_IPC_HOOK_CLI

    mkdir -p "${BATS_TEST_TMPDIR}/bin" "${REMOTE_CLI}" "${LOCAL_BIN}"

    cat > "${BATS_TEST_TMPDIR}/bin/tmux" <<EOF
#!/usr/bin/env bash
printf 'tmux %s\n' "\$*" >> "${CALLS}"
echo "\${CLIENT_PID:-4242}"
EOF

    cat > "${REMOTE_CLI}/code" <<EOF
#!/usr/bin/env bash
printf 'remote code hook=%s %s\n' "\${VSCODE_IPC_HOOK_CLI:-}" "\$*" >> "${CALLS}"
EOF

    cat > "${LOCAL_BIN}/code" <<EOF
#!/usr/bin/env bash
printf 'local code %s\n' "\$*" >> "${CALLS}"
EOF

    chmod +x "${BATS_TEST_TMPDIR}"/bin/* "${REMOTE_CLI}/code" "${LOCAL_BIN}/code"
    export PATH="${BATS_TEST_TMPDIR}/bin:${LOCAL_BIN}:${PATH}"
    export PROC_ROOT="${BATS_TEST_TMPDIR}/proc"
}

# The environment of a tmux client started from VS Code's terminal, as
# /proc gives it: NUL-separated, with the hook and the remote CLI first on
# its PATH.
client_environ() {
    mkdir -p "${PROC_ROOT}/4242"
    printf 'HOME=/home/test\0VSCODE_IPC_HOOK_CLI=%s\0PATH=%s:/usr/bin\0' \
        "$1" "${REMOTE_CLI}" > "${PROC_ROOT}/4242/environ"
}

@test "in VS Code's own terminal, the remote CLI on the path runs with the arguments" {
    export VSCODE_IPC_HOOK_CLI=/tmp/vscode-ipc-own.sock
    PATH="${REMOTE_CLI}:${PATH}" run "$SCRIPT" --diff left right
    [ "$status" -eq 0 ]
    grep -qx "remote code hook=/tmp/vscode-ipc-own.sock --diff left right" "$CALLS"
    [ "$(grep -c '^tmux' "$CALLS")" -eq 0 ]
}

@test "inside tmux, the hook and the remote CLI are borrowed from the attached client" {
    export TMUX=/tmp/tmux-1000/default,1,0
    client_environ /tmp/vscode-ipc-client.sock
    run "$SCRIPT" --diff left right
    [ "$status" -eq 0 ]
    grep -qx "tmux display-message -p #{client_pid}" "$CALLS"
    grep -qx "remote code hook=/tmp/vscode-ipc-client.sock --diff left right" "$CALLS"
}

@test "a code installed on the box is never the one run" {
    # In tmux the shell's own `code` is the standalone CLI in ~/.local/bin,
    # which has no window: with a hook set but that code first on the path,
    # the client's remote CLI is still the one used.
    export TMUX=/tmp/tmux-1000/default,1,0
    export VSCODE_IPC_HOOK_CLI=/tmp/vscode-ipc-stale.sock
    client_environ /tmp/vscode-ipc-client.sock
    run "$SCRIPT" --diff left right
    [ "$status" -eq 0 ]
    [ "$(grep -c '^local code' "$CALLS")" -eq 0 ]
    grep -qx "remote code hook=/tmp/vscode-ipc-client.sock --diff left right" "$CALLS"
}

@test "a client with no hook, such as one attached from a plain SSH session, is refused" {
    export TMUX=/tmp/tmux-1000/default,1,0
    mkdir -p "${PROC_ROOT}/4242"
    printf 'HOME=/home/test\0PATH=/usr/bin\0' > "${PROC_ROOT}/4242/environ"
    run "$SCRIPT" --diff left right
    [ "$status" -eq 1 ]
    [[ "$output" == *"No VS Code window"* ]]
    [ ! -e "$CALLS" ] || [ "$(grep -c 'code' "$CALLS")" -eq 0 ]
}

@test "outside VS Code's terminal and outside tmux, it refuses and says where to run" {
    run "$SCRIPT" --diff left right
    [ "$status" -eq 1 ]
    [[ "$output" == *"✗ No VS Code window to open it in."* ]]
    [[ "$output" == *"just tw"* ]]
    [ ! -e "$CALLS" ]
}

@test "no arguments is a usage error" {
    run "$SCRIPT"
    [ "$status" -eq 2 ]
    [[ "$output" == Usage:* ]]
}
