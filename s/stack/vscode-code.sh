#!/usr/bin/env bash
# Run VS Code's `code` for the window this terminal belongs to, from tmux too.
#
# Usage: vscode-code.sh <arguments for code>, such as --diff <left> <right>
#
# VS Code's integrated terminal carries two things that let `code` reach
# the window it is in: VSCODE_IPC_HOOK_CLI, the socket of that window, and
# the remote CLI, put first on PATH so that `code` is the one that talks to
# the socket rather than a `code` installed on the box, which has no window
# and says so. Over Remote SSH that is what opens a file in the right
# window.
#
# A shell inside tmux has neither. The tmux server keeps the environment it
# was started with, and the `code` on its PATH is the standalone CLI in
# ~/.local/bin, whose `--diff` prints an error and opens nothing. But the
# tmux client attached to this session was started from the integrated
# terminal by `just tw`, so its own environment has both. tmux names that
# process, and /proc gives its environment, so they are borrowed from there.
#
# PROC_ROOT stands in for /proc in the tests.
#
# Exit codes:
#   that of code  when a window was found to run it for
#   1             no window to open it in
#   2             usage
set -uo pipefail

if [ "$#" -eq 0 ]; then
    echo "Usage: vscode-code.sh <arguments for code>" >&2
    exit 2
fi

proc_root="${PROC_ROOT:-/proc}"

# From a NUL-separated environment, such as /proc/<pid>/environ: the hook,
# and the folder of the remote CLI, which is the PATH entry ending in
# remote-cli.
hook_in() {
    tr '\0' '\n' < "$1" | sed -n 's/^VSCODE_IPC_HOOK_CLI=//p' | head -n 1
}

remote_cli_in() {
    tr '\0' '\n' < "$1" | sed -n 's/^PATH=//p' | head -n 1 \
        | tr ':' '\n' | grep -m 1 '/remote-cli$' || true
}

# This is VS Code's own terminal: the hook is set, and the `code` on the
# path is the remote CLI rather than one installed on the box.
if [ -n "${VSCODE_IPC_HOOK_CLI:-}" ]; then
    found="$(command -v code || true)"

    case "${found}" in
        */remote-cli/code)
            exec "${found}" "$@"
            ;;
    esac
fi

# Inside tmux: borrow both from the attached client.
if [ -n "${TMUX:-}" ]; then
    client="$(tmux display-message -p '#{client_pid}' 2>/dev/null || true)"
    environ="${proc_root}/${client}/environ"

    if [ -n "${client}" ] && [ -r "${environ}" ]; then
        hook="$(hook_in "${environ}")"
        cli_dir="$(remote_cli_in "${environ}")"

        if [ -n "${hook}" ] && [ -x "${cli_dir}/code" ]; then
            VSCODE_IPC_HOOK_CLI="${hook}" exec "${cli_dir}/code" "$@"
        fi
    fi
fi

echo "✗ No VS Code window to open it in. Run this in VS Code's terminal, or in a tmux window opened from one with \`just tw\`." >&2
exit 1
