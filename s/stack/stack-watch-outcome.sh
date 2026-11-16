#!/usr/bin/env bash
# Says whether `just stack-watch` should stop and show a recipe's output.
#
# Usage: stack-watch-outcome.sh <exit-status> < <the recipe's output>
#
# The watcher runs a recipe when a key is pressed, such as `stack-sync` for
# `s`, and keeps its output out of the way unless something went wrong. This
# decides what "went wrong" means.
#
# It stops for two things only: the recipe exited non-zero, or it printed a
# line starting with ✗. A recipe uses ✗ for work it did not do while still
# exiting 0, such as a stack it skipped because it spans worktrees.
#
# It does not stop for a ⚠ line. Those are warnings about work that was
# done. The one that prompted this: `gh stack sync` prints "The stack on
# GitHub differs from your local stack and couldn't be updated
# automatically" whenever a pull request in the stack was closed by GitHub
# after the branch beneath it merged. The branches are rebased and pushed
# all the same, and the watcher used to stop on every sync until somebody
# opened a pull request to replace the closed one.
#
# Exit codes:
#   0  carry on, and keep the output hidden
#   1  stop and show the output
set -uo pipefail

status="${1:-}"

if [[ ! "$status" =~ ^[0-9]+$ ]]; then
    echo "Usage: stack-watch-outcome.sh <exit-status> < <the recipe's output>" >&2
    exit 2
fi

if [ "$status" -ne 0 ]; then
    exit 1
fi

output="$(cat)"

# A stack whose last pull request has merged is cleared, and says so. Lines
# printed on the way there do not matter once it has.
if grep -q 'Stack fully merged - cleared' <<<"$output"; then
    exit 0
fi

# Two ✗ lines are expected and harmless: the trunk is held by another
# worktree, and a branch that has no pull request yet.
if grep -E '^[[:space:]]*✗ ' <<<"$output" \
    | grep -vqE 'Could not update local main|has no PR$'; then
    exit 1
fi

exit 0
