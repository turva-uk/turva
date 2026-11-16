#!/usr/bin/env bats
# Tests for what makes `just stack-watch` stop and show a recipe's output.

setup() {
    SCRIPT="${BATS_TEST_DIRNAME}/../stack-watch-outcome.sh"
}

# outcome <exit-status> <output>
outcome() {
    printf '%s\n' "$2" | bash "$SCRIPT" "$1"
}

@test "a clean run carries on" {
    run outcome 0 "✓ Pushed 6 branches"

    [ "$status" -eq 0 ]
}

@test "a recipe that exited non-zero stops" {
    run outcome 1 "✓ Pushed 6 branches"

    [ "$status" -eq 1 ]
}

@test "the warning that GitHub's stack differs does not stop a sync that worked" {
    # What gh stack sync prints when a pull request in the stack was
    # closed by GitHub after the branch beneath it merged.
    run outcome 0 "✓ Pushed 6 branches
⚠ The stack on GitHub differs from your local stack and couldn't be updated automatically
✓ Branches synced"

    [ "$status" -eq 0 ]
}

@test "no warning line stops a run, whatever it says" {
    run outcome 0 "  ⚠ needs rebase"

    [ "$status" -eq 0 ]
}

@test "work a recipe says it did not do stops, though it exited 0" {
    run outcome 0 "  ✗ Skipped: this stack spans more than one worktree."

    [ "$status" -eq 1 ]
}

@test "a failed check drawn beside a branch is not a line that stops" {
    # The stack drawing marks a red check with ✗ in the middle of a line.
    run outcome 0 "  ○ feature/scheduler-take-the-timers-out   #1864   ✗ -"

    [ "$status" -eq 0 ]
}

@test "the trunk being held by another worktree does not stop" {
    run outcome 0 "✗ Could not update local main"

    [ "$status" -eq 0 ]
}

@test "a branch with no pull request yet does not stop" {
    run outcome 0 "✗ feature/auth-say-whether-a-page-is-public has no PR"

    [ "$status" -eq 0 ]
}

@test "an expected line does not excuse a real one beside it" {
    run outcome 0 "✗ Could not update local main
  ✗ Skipped: this stack spans more than one worktree."

    [ "$status" -eq 1 ]
}

@test "a stack cleared after its last merge carries on, whatever came before" {
    run outcome 0 "  ✗ something on the way
  Stack fully merged - cleared. Now on origin/main (abc1234)."

    [ "$status" -eq 0 ]
}

@test "a cleared stack does not excuse a non-zero exit" {
    run outcome 2 "  Stack fully merged - cleared. Now on origin/main (abc1234)."

    [ "$status" -eq 1 ]
}

@test "no output at all carries on" {
    run bash -c "bash '$SCRIPT' 0 < /dev/null"

    [ "$status" -eq 0 ]
}

@test "a status that is not a number is an error" {
    run outcome "" "anything"

    [ "$status" -eq 2 ]
    [[ "$output" == *"Usage:"* ]]
}
