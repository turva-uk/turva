set shell := ["bash", "-c"]

# These recipes are thin wrappers over the scripts in s/, which are the single
# implementation of each repeated process (see s/README.md). Keeping the logic
# in one place matters: when the two drifted, the `docs` recipe was left
# building a frontend that no longer exists and serving with mkdocs after the
# migration to Zensical.
#
# Use `just` for the short aliases, or call ./s/<script> directly. Both work.

default:
    @just --list


alias sd := start-dev
# Start the dev stack. Pass 'b' to rebuild images first.
start-dev build="":
    #!/usr/bin/env bash
    set -euo pipefail
    if [ "{{build}}" = "b" ]; then
        exec ./s/up --build
    fi
    exec ./s/up


alias dd := dev-down
# Stop the containers
dev-down:
    @./s/down


alias r := restart
# Restart all services or a specific service (e.g. 'j r api')
restart service="":
    @./s/restart {{service}}


alias l := logs
# Follow logs for all services or a specific service (e.g. 'j l api')
logs service="":
    @./s/logs {{service}}


alias c := clean
# Remove all containers, volumes, and cached images
clean:
    @./s/clean


alias t := test
# Run the test suite in the api container (e.g. 'j t -k login')
test *args:
    @./s/test {{args}}


alias pt := python-test
# Run only the unit tests
python-test:
    @./s/test /app/src/tests/unit -v


alias ti := test-integration
# Run only the integration tests
test-integration:
    @./s/test /app/src/tests/integration -v


alias tc := test-coverage
# Run all tests with an HTML coverage report
test-coverage:
    #!/usr/bin/env bash
    set -euo pipefail
    ./s/test /app/src
    echo "Coverage report generated in api/src/htmlcov/index.html"


alias pc := pre-commit
# Run every check CI enforces (pre-commit, then the Zizmor Actions audit)
pre-commit:
    @./s/lint


alias lint := pre-commit


# Regenerate the pinned dependency locks from the .in declarations
lock:
    @./s/lock


alias d := docs
# Serve the documentation site at http://localhost:8001
docs:
    @./s/docs


alias rb := remove-branches
# Remove all local branches that have been merged into main
remove-branches:
    #!/usr/bin/env bash
    set -euo pipefail
    git fetch -p && git branch -vv | awk '/: gone]/{print $1}' | xargs -r git branch -d


alias aj := abbreviate-just
# Add a 'j' alias for 'just' to ~/.zshrc
abbreviate-just:
    #!/usr/bin/env bash
    set -euo pipefail
    alias_definition="alias j='just'"

    if grep -Fxq "$alias_definition" ~/.zshrc; then
        echo "Alias already exists in ~/.zshrc"
    else
        echo "$alias_definition" >> ~/.zshrc
        echo "Alias added to ~/.zshrc"
    fi

    echo "Run 'source ~/.zshrc' to apply the change to this terminal."


alias cl := claude-session
# Go to this checkout's Claude session in tmux, starting it or Claude again if needed
claude-session:
    #!/usr/bin/env bash
    # Opens this checkout's Claude session in this terminal, and makes sure
    # Claude is running in it.
    #
    # The session is claude-turva for the main checkout, and claude-turva-2
    # for the worktree in turva-2.
    #
    # - If there is no claude tmux session, it starts one with Claude in it.
    # - If Claude has stopped but the tmux session exists, it starts Claude
    # again.
    # - You can run it from outside tmux, or from another tmux session.
    #
    # Claude started here is linked to the VS Code window. If Claude was
    # already running, type /ide in it to link it.

    set -euo pipefail

    if ! command -v tmux > /dev/null; then
        echo "✗ tmux is not installed." >&2
        exit 1
    fi

    top={{quote(justfile_directory())}}
    folder="$(basename "${top}")"

    # The main checkout is turva, and a worktree is turva-2, turva-3 and so
    # on. The number keeps each one's sessions apart.
    case "${folder}" in
        turva) worktree="" ;;
        turva-[2-9] | turva-[1-9][0-9]) worktree="${folder#turva-}" ;;
        *)
            echo "✗ This folder is ${folder}. Sessions are named after turva or turva-<number>, so rename the folder to one of those." >&2
            exit 1
            ;;
    esac

    name="claude-turva${worktree:+-${worktree}}"
    start_claude="claude --continue --ide --remote-control ${name} || claude --ide --remote-control ${name}"

    if ! tmux has-session -t "=${name}" 2> /dev/null; then
        tmux new-session -d -s "${name}" -c "${top}" "bash -lc '${start_claude}; exec bash'"
        echo "Started ${name} in ${top}"
    else
        pane_id="$(tmux display-message -p -t "=${name}:" "#{pane_id}")"
        pane_pid="$(tmux display-message -p -t "=${name}:" "#{pane_pid}")"

        # The pane is its process session's leader, so its pid is the session id.
        if ! pgrep -x -s "${pane_pid}" claude > /dev/null; then

            # This terminal is the pane, so start Claude here.
            if [ "${TMUX_PANE:-}" = "${pane_id}" ]; then
                cd "${top}"
                bash -c "${start_claude}"
                exit 0
            fi

            tmux send-keys -t "${pane_id}" "${start_claude}" Enter
            echo "Started Claude again in ${name}"
        fi
    fi

    if [ -n "${TMUX:-}" ]; then
        if [ "$(tmux display-message -p "#{session_name}")" = "${name}" ]; then
            exit 0
        fi

        exec tmux switch-client -t "=${name}"
    fi

    exec tmux attach -t "=${name}"


alias tw := tmux-window
# Go to a plain shell in tmux for this checkout, starting it if needed; `just tw 2` for a second
tmux-window NUMBER="":
    #!/usr/bin/env bash
    # Opens a plain shell in tmux for this checkout, so a command run there
    # keeps going after this terminal closes.
    #
    # The session is tmux-turva-1 for the main checkout, and tmux-turva-2
    # for the worktree in turva-2. A number gives another shell beside the
    # first: `just tw 2` is tmux-turva-1-2 in the main checkout, and running
    # it again comes back to it.
    #
    # It starts the session, with a login shell in the checkout, if there
    # is none. Then it attaches from outside tmux, or switches from another
    # tmux session.

    set -euo pipefail

    number={{quote(NUMBER)}}

    case "${number}" in
        "" | [2-9] | [1-9][0-9]) ;;
        *)
            echo "✗ The number names another shell beside the first, so it runs from 2 to 99: just tw 2" >&2
            exit 1
            ;;
    esac

    if ! command -v tmux > /dev/null; then
        echo "✗ tmux is not installed." >&2
        exit 1
    fi

    top={{quote(justfile_directory())}}
    folder="$(basename "${top}")"

    # The main checkout is turva, and a worktree is turva-2, turva-3 and so
    # on. The number keeps each one's sessions apart.
    case "${folder}" in
        turva) worktree="" ;;
        turva-[2-9] | turva-[1-9][0-9]) worktree="${folder#turva-}" ;;
        *)
            echo "✗ This folder is ${folder}. Sessions are named after turva or turva-<number>, so rename the folder to one of those." >&2
            exit 1
            ;;
    esac

    # The main checkout counts as 1 here, so its second shell,
    # tmux-turva-1-2, cannot be mistaken for the first shell of turva-2,
    # which is tmux-turva-2.
    name="tmux-turva-${worktree:-1}${number:+-${number}}"

    if ! tmux has-session -t "=${name}" 2> /dev/null; then
        tmux new-session -d -s "${name}" -c "${top}" "bash -l"
        echo "Started ${name} in ${top}"
    fi

    if [ -n "${TMUX:-}" ]; then
        if [ "$(tmux display-message -p "#{session_name}")" = "${name}" ]; then
            exit 0
        fi

        exec tmux switch-client -t "=${name}"
    fi

    exec tmux attach -t "=${name}"


alias lc := link-claude
# Link one person's .claude-personal/<name>/ into .claude/ so their skills, rules and CLAUDE.md load: `just lc mark`
link-claude NAME:
    #!/usr/bin/env bash
    # .claude-personal/ holds each person's own Claude Code set-up, in a
    # folder named after them: CLAUDE.md, rules/ and skills/, as plain
    # tracked files. Claude Code only loads them from .claude/, which is
    # git-ignored, so they do nothing for anyone else until this links them
    # in.
    #
    # Run it once in each clone or worktree. Running it again changes
    # nothing. Running it with another name switches to that person's set.

    set -euo pipefail

    name={{quote(NAME)}}

    # Lower-case letters only, so the name can only ever be a folder
    # directly inside .claude-personal/.
    if ! [[ "${name}" =~ ^[a-z]+$ ]]; then
        echo "✗ Give a first name in lower case, for example: just lc mark" >&2
        exit 1
    fi

    cd {{quote(justfile_directory())}}
    source=".claude-personal/${name}"

    if [ ! -d "${source}" ]; then
        echo "✗ ${source} is missing. Create it with CLAUDE.md, rules/ and skills/ inside, then run this again." >&2
        exit 1
    fi

    # Check everything first, so a missing part links nothing at all.
    for item in skills rules CLAUDE.md; do
        if [ ! -e "${source}/${item}" ]; then
            echo "✗ ${source}/${item} is missing, so there is nothing to link." >&2
            exit 1
        fi

        if [ -e ".claude/${item}" ] && [ ! -L ".claude/${item}" ]; then
            echo "✗ .claude/${item} is real, not a link. Move its contents into ${source}/${item} and remove it, then run this again." >&2
            exit 1
        fi
    done

    mkdir -p .claude

    # The two folders and the file are linked the same way. Claude Code
    # loads .claude/CLAUDE.md alongside the root CLAUDE.md.
    for item in skills rules CLAUDE.md; do
        link=".claude/${item}"
        target="../${source}/${item}"

        ln -sfn "${target}" "${link}"
        echo "${link} -> ${target}"
    done


alias nli := notify-listen-install
# Install the Mac's listener for banners from a Linux box (macOS only; run again after the scripts change)
notify-listen-install:
    ./s/notification/notification-listen-install.sh


# Stacked pull requests
#
# Recipes over the `gh stack` extension, for building a piece of work as a
# chain of small branches, each with its own pull request. The `/f` skill
# drives them, and they work just as well by hand: `just stack-help` lists
# them. Their helper scripts live in s/stack/, by full path, so a recipe
# that has changed directory can still find them.
stack_scripts := justfile_directory() / "s" / "stack"


# Prefix a bare name with feature/, leaving an already-prefixed one alone.
#
# Every unit of work goes on a feature/* branch, so a stack branch named
# without the prefix is given one here rather than unpicked by hand later.
_stack-branch-name name:
    #!/usr/bin/env bash
    set -euo pipefail

    case "{{name}}" in
        feature/*|hotfix/*|renovate/*) echo "{{name}}" ;;
        *) echo "feature/{{name}}" ;;
    esac


# Refuse a stack operation when a stack branch lives in another worktree.
#
# gh-stack keeps one record for every worktree, in the shared .git/gh-stack.
# But a branch can be checked out in only one worktree at a time, so a stack
# is worked on from one worktree, and its branches must not be checked out
# in any other.
#
# The guard matters because `gh stack rebase` does not enforce that itself.
# Given a branch checked out elsewhere it prints the git error, skips the
# branch, and still exits 0 (github/gh-stack#35). Anything chaining
# `rebase && submit` would then push a stack it believed was rebased and
# was not.
_stack-guard:
    #!/usr/bin/env bash
    set -uo pipefail
    python3 "{{stack_scripts}}"/stack-status.py --check
    status=$?

    # 1 is "no stack here". The script has already named the recipes and
    # the skill that start or check out one, so stopping here keeps that
    # the last thing on the screen.
    if [ "${status}" -eq 1 ]; then
        exit 1
    fi

    if [ "${status}" -eq 2 ]; then
        echo "✗ Refusing to run: this stack spans more than one worktree." >&2
        echo "  Free the branches above, or run this from the worktree" >&2
        echo "  that owns the stack." >&2
        exit 1
    fi


alias stc := stack-checkout
# Check out a stack by number, PR number, PR URL or branch (picker if empty)
stack-checkout target="":
    #!/usr/bin/env bash
    set -euo pipefail

    # The recovery path when a stack is missing from the local record in
    # .git/gh-stack. This fetches the stack back from GitHub, which works
    # once two or more pull requests exist. With no argument it opens a
    # picker of every stack.
    gh stack checkout {{target}}
    python3 "{{stack_scripts}}"/stack-status.py


alias stf := stack-files
# List what each branch in the stack changes, against its own parent
stack-files patch="":
    #!/usr/bin/env bash

    # Against its own parent, not the trunk: a branch three layers up
    # diffed against main replays every change below it, which is the
    # wall of diff that stacking exists to avoid. Pass 'p' for the full
    # patch rather than the per-file summary.
    if [ "{{patch}}" = "p" ]; then
        python3 "{{stack_scripts}}"/stack-status.py --files --patch || true
    else
        python3 "{{stack_scripts}}"/stack-status.py --files || true
    fi


alias stfr := stack-fresh
# Move this checkout to current main, carrying uncommitted work, ready for stack-new
stack-fresh:
    #!/usr/bin/env bash
    set -euo pipefail

    # For the moment after a stack has merged: the branch checked out is
    # spent, the trunk has moved, and the working tree holds the next unit.
    # `just stack-sync` then `git switch main` does not survive the ordinary
    # case: the sync will not rebase with uncommitted changes in the tree,
    # `main` may be checked out in another worktree, and a plain switch
    # refuses whenever the trunk has changed a file that is also changed
    # locally.
    #
    # So: detach at the trunk's tip rather than switch to the branch, which
    # another worktree may hold, and carry the work with a three-way merge.
    # `--merge` keeps every local change and combines it with what the
    # trunk changed in the same file. If the two cannot be combined git
    # leaves conflict markers, nothing is lost, and this stops and says
    # which files.
    trunk="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || true)"
    trunk="${trunk:-main}"
    git fetch origin "${trunk}" --quiet

    if ! git switch --detach --merge "origin/${trunk}" >/dev/null; then
        echo "✗ Could not move this checkout to origin/${trunk}." >&2
        exit 1
    fi

    conflicted="$(git diff --name-only --diff-filter=U)"

    if [ -n "${conflicted}" ]; then
        echo "✗ The uncommitted work overlaps what has merged, in:" >&2
        echo "${conflicted}" | sed 's/^/    /' >&2
        echo "  Each file holds both versions between conflict markers." >&2
        echo "  Settle them by hand, then run: just stack-new <name> \"<message>\"" >&2
        exit 1
    fi

    # The spent stack's record still names its merged branches, and a new
    # stack started beside it would be drawn underneath them.
    python3 "{{stack_scripts}}"/stack-forget-merged.py >/dev/null 2>&1 || true
    echo "  On origin/${trunk} ($(git rev-parse --short HEAD)), with the uncommitted work carried across."
    echo "  Next: just stack-new <name> \"<message>\""


alias sth := stack-help
# List the stack commands, one per line, with their arguments
stack-help:
    #!/usr/bin/env bash
    set -euo pipefail

    # Read back out of `just --list` rather than written out here, so the
    # list cannot go stale when a recipe gains an argument. `--list` prints
    # "  name args   # description [alias: x]"; only the part before the
    # comment, and the alias, are wanted.
    #
    # Coloured only when stdout is a terminal, so piping or capturing the
    # output does not pick up escape sequences.
    if [ -t 1 ]; then
        recipe_colour=$'\033[38;2;206;166;87m'
        argument_colour=$'\033[38;2;159;206;253m'
        reset=$'\033[0m'
    else
        recipe_colour=""
        argument_colour=""
        reset=""
    fi

    # Collected into arrays first, because the alias column is aligned on
    # the widest signature, which is not known until every line is read.
    signatures=()
    aliases=()
    widest=0

    while IFS= read -r line; do
        alias_name=""
        case "${line}" in
            *"[alias: "*)
                alias_name="${line##*\[alias: }"
                alias_name="${alias_name%%]*}"
                ;;
        esac
        signature="${line%%#*}"
        signature="${signature%"${signature##*[![:space:]]}"}"

        signatures+=("${signature}")
        aliases+=("${alias_name}")
        [ "${#signature}" -gt "${widest}" ] && widest="${#signature}"
    done < <(
        just --list 2>/dev/null \
            | grep -E '^\s+stack(-[a-z-]+)?( |$)' \
            | sed -E 's/^[[:space:]]+//'
    )

    echo ""
    echo "  Prefix any of these with 'just' to run it:"
    echo ""

    for index in "${!signatures[@]}"; do
        signature="${signatures[${index}]}"
        alias_name="${aliases[${index}]}"
        name="${signature%% *}"
        arguments="${signature#"${name}"}"
        arguments="${arguments# }"

        if [ -n "${arguments}" ]; then
            rendered="${recipe_colour}${name}${reset} ${argument_colour}${arguments}${reset}"
        else
            rendered="${recipe_colour}${name}${reset}"
        fi

        # Padded on the signature's own length, never on `rendered`, whose
        # escape sequences take width in the string and none on the screen.
        padding=$((widest - ${#signature}))
        if [ -n "${alias_name}" ]; then
            printf '  %s%*s   %s%s%s\n' \
                "${rendered}" "${padding}" "" \
                "${recipe_colour}" "${alias_name}" "${reset}"
        else
            printf '  %s\n' "${rendered}"
        fi
    done

    echo ""


alias stl := stack-log
# Show the current stack (fast, local only - no network)
stack-log:
    #!/usr/bin/env bash

    # Local flags only: branch order, merged, needs-rebase, and which
    # branches another worktree holds. Instant and works offline.
    # `just stll` is the same picture with pull request and CI state.
    #
    # Exit 1 means "no stack here", which the script has already explained.
    # Passing it through would make just print "Recipe failed", dressing an
    # ordinary answer up as a fault.
    python3 "{{stack_scripts}}"/stack-status.py || true


alias stll := stack-log-long
# Show the current stack with pull request and CI state (one network call)
stack-log-long:
    #!/usr/bin/env bash

    # One `gh pr list` for the whole stack rather than one call per branch,
    # so a six-deep stack is one round trip. This is the view that answers
    # "is this one green yet" without opening a browser.
    python3 "{{stack_scripts}}"/stack-status.py --prs || true


alias stm := stack-move
# Move about the stack: up, down, top, bottom, trunk, or a picker if empty
stack-move direction="":
    #!/usr/bin/env bash
    set -euo pipefail

    # `gh stack switch` with no argument opens an interactive picker; the
    # named directions are the cheap ones. Redrawing afterwards is what
    # makes the move legible.
    case "{{direction}}" in
        "")               gh stack switch ;;
        up|u)             gh stack up ;;
        down|d)           gh stack down ;;
        top|t)            gh stack top ;;
        bottom|b)         gh stack bottom ;;
        trunk|main)       gh stack trunk ;;
        [1-9]|[1-9][0-9])

            # A branch by its number, 1 at the bottom. The script owns the
            # numbering so that the number and the branch it reaches cannot
            # drift apart.
            if ! target="$(python3 "{{stack_scripts}}"/stack-status.py --branch-at "{{direction}}")"; then
                echo "✗ No open branch numbered {{direction}} in this stack." >&2
                exit 1
            fi
            git switch "${target}"
            ;;
        *)
            echo "✗ Unknown direction: {{direction}}" >&2
            echo "  Use: up, down, top, bottom, trunk, a branch number - or none for a picker." >&2
            exit 1
            ;;
    esac

    python3 "{{stack_scripts}}"/stack-status.py


alias stn := stack-new
# Start a new stack: create the bottom branch, commit everything, draw it
stack-new name message:
    #!/usr/bin/env bash
    set -euo pipefail
    branch="$(just _stack-branch-name '{{name}}')"

    # init adopts the branch it creates as the bottom of a new stack, based
    # on the default branch. No guard here: there is no stack to span a
    # worktree yet, and this is the command that creates one.
    #
    # Safe to re-run. A pre-commit hook that stops the commit below leaves
    # the branch created and the stack initialised, so a second run picks
    # up from the commit rather than failing on `git switch -c`.
    if git show-ref --verify --quiet "refs/heads/${branch}"; then
        if [ "$(git branch --show-current)" != "${branch}" ]; then
            git switch "${branch}"
        fi

        # A run stopped after `git switch -c` and before `gh stack init`
        # leaves the branch made but in no stack, and a re-run that skipped
        # init would commit onto it unregistered: stack-submit then pushes
        # nothing. Finish the init, but only for a branch with no commits
        # of its own. Exit 1 from --check means no stack here.
        in_stack=0
        python3 "{{stack_scripts}}"/stack-status.py --check >/dev/null 2>&1 || in_stack=$?

        if [ "${in_stack}" -eq 1 ]; then
            git fetch origin main --quiet || true

            if [ "$(git rev-list --count origin/main..HEAD)" -ne 0 ]; then
                echo "✗ ${branch} already has commits of its own and is in no stack." >&2
                echo "  Start the stack from a new name, or ask what the branch holds." >&2
                exit 1
            fi

            gh stack init "${branch}"
        fi
    else

        # A new stack is cut from wherever the checkout is, so it has to be
        # at the trunk's tip. Cut from a branch that has merged, the new
        # branch sits behind the trunk and its pull request carries the old
        # stack's merge commits, and nothing warns of it.
        git fetch origin main --quiet || true
        if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
            echo "✗ Refusing to start a stack here: this checkout is not at origin/main." >&2
            echo "  Move to it first, carrying any uncommitted work across:" >&2
            echo "    just stack-fresh" >&2
            exit 1
        fi
        git switch -c "${branch}"
        gh stack init "${branch}"
    fi

    # -A stages everything, untracked files included. Splitting a dirty
    # tree across branches is done by committing what is ready and leaving
    # the rest for the branch above.
    git add -A
    git commit -m "{{message}}"
    python3 "{{stack_scripts}}"/stack-status.py


alias strd := stack-ready
# Take every open pull request in this worktree's stack out of draft
stack-ready:
    #!/usr/bin/env bash
    set -euo pipefail
    just _stack-guard

    # Bottom to top, the order `gh stack view` lists them, so the branch
    # nearest main is ready first. Merged branches and branches with no pull
    # request are skipped rather than failed: a stack part-way through
    # merging is normal. This never merges anything; that stays a human act.
    prs="$(gh stack view --json \
        | jq -r '.branches[] | select(.isMerged | not) | .pr.number // empty')"

    if [ -z "${prs}" ]; then
        echo "No open pull requests in this stack."
        exit 0
    fi

    for number in ${prs}; do
        state="$(gh pr view "${number}" --json state,isDraft \
            --jq '"\(.state) \(.isDraft)"')"
        case "${state}" in
            "OPEN true") gh pr ready "${number}" ;;
            "OPEN false") echo "#${number} is already ready for review." ;;
            *) echo "#${number} is not open (${state%% *}); skipped." ;;
        esac
    done

    python3 "{{stack_scripts}}"/stack-status.py --prs

alias str := stack-rebase
# Rebase the whole stack onto an updated trunk, refusing if it spans worktrees
stack-rebase:
    #!/usr/bin/env bash
    set -euo pipefail
    just _stack-guard
    gh stack rebase

    # gh stack rebase exits 0 even when it skipped a branch, so the result is
    # verified rather than trusted: `view --json` reports needsRebase
    # correctly for exactly the branch a silent skip leaves behind. A branch
    # in a merge queue, and one sitting exactly on it, are left out: the
    # rebase leaves a queued branch alone on purpose. See --left-behind.
    if ! left_behind="$(python3 "{{stack_scripts}}"/stack-status.py --left-behind)"; then
        echo "" >&2
        echo "✗ Branches still need a rebase after gh stack rebase:" >&2
        printf '    %s\n' ${left_behind} >&2
        echo "  It reports success even when it skips a branch." >&2
        echo "  Run 'just stack-log' to see where they sit." >&2
        echo "" >&2
        echo "  If it instead conflicted in files this branch never" >&2
        echo "  touched, the record's trunk.head is stale: run" >&2
        echo "  'just stack-refresh'. See that recipe for why." >&2
        exit 1
    fi

    python3 "{{stack_scripts}}"/stack-status.py


alias stre := stack-refresh
# Repoint a stale stack record at today's trunk, fixing runaway rebases
stack-refresh:
    #!/usr/bin/env bash
    set -euo pipefail

    # The record in .git/gh-stack stores trunk.head: the commit main sat
    # at when the stack was started. `gh stack rebase` works out "your
    # commits" from that point, and nothing refreshes it as the branches
    # below merge. Once it is stale, everything merged into main since
    # then looks like unpushed work of yours, and the rebase replays it
    # onto a main that already has it, conflicting against history in
    # files the branch never touched.
    #
    # `stack-sync` does not fix this: it prunes merged branches and
    # redraws, leaving trunk.head exactly as it was. Only unstack-then-init
    # rewrites it.
    #
    # No commit is touched: unstack removes the local record, init adopts
    # the same branches again against today's trunk. Branches that have
    # merged are left out, so a stack part-way through landing rebuilds as
    # the units still in flight, based on main.
    branch="$(git branch --show-current)"

    if [ -z "${branch}" ] || [ "${branch}" = "main" ]; then
        echo "✗ Run this from a branch in the stack, not main." >&2
        exit 1
    fi

    # Bottom to top, which is the order `gh stack init` adopts them in.
    branches="$(python3 "{{stack_scripts}}"/stack-status.py --rebuild-order)"

    if [ -z "${branches}" ]; then
        echo "✗ No unmerged branches in this stack to rebuild." >&2
        exit 1
    fi

    # unstack drops this stack from the record, so keep a copy: if init
    # then fails, the copy goes back.
    record="$(git rev-parse --path-format=absolute --git-common-dir)/gh-stack"
    backup="$(mktemp)"
    rebuilt=0
    cp "${record}" "${backup}"

    restore() {
        if [ "${rebuilt}" -ne 1 ] && [ -s "${backup}" ]; then
            cp "${backup}" "${record}"
            echo "✗ Refresh failed - the stack record was restored." >&2
        fi

        rm -f "${backup}"
    }

    trap restore EXIT

    git fetch origin main --quiet
    echo "Rebuilding the stack record for:"
    echo "${branches}" | sed 's/^/  /'

    if python3 "{{stack_scripts}}"/stack-relink.py --needed; then

        # GitHub refuses to unstack a stack holding a merged pull request,
        # and the attempt can leave the open ones in no stack on GitHub at
        # all. So GitHub's stack is left alone: the record is rebuilt
        # locally, the open pull requests are linked into a stack, and the
        # record is pointed at it. See s/stack/stack-relink.py.
        echo "GitHub's stack holds merged pull requests, which it will"
        echo "not unstack. Rebuilding the local record and linking the"
        echo "open pull requests instead."
        gh stack unstack --local

        # shellcheck disable=SC2086
        gh stack init ${branches}

        # shellcheck disable=SC2086
        python3 "{{stack_scripts}}"/stack-relink.py --link ${branches}
    else
        gh stack unstack

        # shellcheck disable=SC2086
        gh stack init ${branches}
    fi

    rebuilt=1
    python3 "{{stack_scripts}}"/stack-status.py


alias strl := stack-relink
# Make the open pull requests one stack on GitHub again, in order
stack-relink:
    #!/usr/bin/env bash
    set -euo pipefail

    # For when GitHub's stack has drifted from this one: split in two,
    # missing pull requests, or holding one that was closed. Nothing is
    # pushed and no branch is touched. See s/stack/stack-relink.py.
    branches="$(python3 "{{stack_scripts}}"/stack-status.py --rebuild-order)"

    if [ -z "${branches}" ]; then
        echo "✗ No unmerged branches in this stack to relink." >&2
        exit 1
    fi

    # shellcheck disable=SC2086
    python3 "{{stack_scripts}}"/stack-relink.py --repair ${branches}

    # shellcheck disable=SC2086
    python3 "{{stack_scripts}}"/stack-relink.py --check ${branches}


alias stsu := stack-submit
# Rebase onto the latest trunk, then push and open or update the drafts
stack-submit:
    #!/usr/bin/env bash
    set -euo pipefail

    # Rebase first, every time. A stack is submitted over and over as the
    # units above it are revised, and main moves underneath it meanwhile.
    # `stack-rebase` rather than a bare `gh stack rebase`, for its worktree
    # guard and its check for a rebase that silently skipped a branch.
    just stack-rebase

    # --auto skips the interactive editor and opens every new pull request
    # as a draft. A person takes a branch out of draft, with `gh pr ready`
    # or on GitHub, once they have read it.
    gh stack submit --auto
    python3 "{{stack_scripts}}"/stack-status.py --prs

    # GitHub keeps its own record of which pull requests are one stack,
    # and `gh stack submit` reports one it could not add only as a
    # warning. So the result is checked, and a mismatch is repaired here,
    # on the push that caused it. A repair that does not make them one
    # stack fails the push, naming the pull requests.
    branches="$(python3 "{{stack_scripts}}"/stack-status.py --rebuild-order)"

    # shellcheck disable=SC2086
    if ! python3 "{{stack_scripts}}"/stack-relink.py --check ${branches}; then
        echo "  Repairing GitHub's stack."
        python3 "{{stack_scripts}}"/stack-relink.py --repair ${branches}
        python3 "{{stack_scripts}}"/stack-relink.py --check ${branches}
    fi


alias stsy := stack-sync
# Drop merged branches, re-target the rest, and redraw the stack. Pass 'a' to sweep every worktree.
stack-sync scope="":
    #!/usr/bin/env bash
    set -uo pipefail

    # One function, called once per worktree, so a sweep gives each checkout
    # exactly the same treatment as a single run rather than a second, more
    # hastily written copy of it. It returns rather than exits: in a sweep a
    # worktree that has nothing to do must not stop the ones after it.
    # Clear out a stack with nothing left to land: move the checkout to the
    # trunk's tip, delete the merged branches and drop them from the record,
    # so the next drawing is the ordinary "no stack on this branch".
    # Returns 0 cleared, 1 the stack is not spent, 2 it could not be cleared.
    #
    # The move is `stack-fresh`'s: detached, because another worktree may
    # hold the trunk, and `--merge`, so uncommitted work comes across.
    # `branch -d`, not `-D`: it refuses a branch with commits the trunk
    # does not have, and one left behind costs nothing.
    clear_spent() {
        local spent=""
        spent="$(python3 "{{stack_scripts}}"/stack-status.py --spent 2>/dev/null)" || return 1

        local trunk=""
        trunk="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || true)"
        trunk="${trunk:-main}"
        if ! git switch --detach --merge "origin/${trunk}" >/dev/null 2>&1; then
            echo "  ✗ Stack fully merged, but this checkout could not move to origin/${trunk}." >&2
            return 2
        fi
        local conflicted=""
        conflicted="$(git diff --name-only --diff-filter=U)"
        if [ -n "${conflicted}" ]; then
            echo "  ✗ Stack fully merged, but the uncommitted work overlaps it, in:" >&2
            echo "${conflicted}" | sed 's/^/      /' >&2
            echo "    Each file holds both versions between conflict markers." >&2
            return 2
        fi

        local name=""
        while IFS= read -r name; do
            if [ -n "${name}" ]; then
                git branch -d "${name}" >/dev/null 2>&1 || true
            fi
        done <<< "${spent}"
        python3 "{{stack_scripts}}"/stack-forget-merged.py >/dev/null 2>&1 || true
        echo "  Stack fully merged - cleared. Now on origin/${trunk} ($(git rev-parse --short HEAD))."
        return 0
    }

    sync_one() {
        cd "$1" || return 0

        # Not `just _stack-guard`: that collapses "no stack here" and "this
        # stack spans worktrees" into the same exit 1, which is the right
        # answer for a single run and the wrong one inside a loop. Both are
        # ordinary outcomes of a sweep and each deserves its own line.
        local status=0
        python3 "{{stack_scripts}}"/stack-status.py --check >/dev/null 2>&1 || status=$?

        if [ "${status}" -eq 1 ]; then
            echo "  No stack here - nothing to sync."
            return 0
        fi

        if [ "${status}" -eq 2 ]; then
            echo "  ✗ Skipped: this stack spans more than one worktree." >&2
            echo "    Free the branches above, or sync it from the worktree" >&2
            echo "    that owns it." >&2
            return 0
        fi

        # Run this after a pull request merges: it notices the merge, deletes
        # the branch, cascade-rebases what sat above it and pushes the result.
        #
        # --prune answers the "delete N merged branches?" prompt in advance.
        # Tidying up after a merge is the whole reason this recipe exists, and
        # a merged branch's commits are on main and its pull request is on
        # GitHub, so there is nothing in one to lose.
        #
        # The record is tidied first as well as afterwards. An entry
        # whose pull request was closed and replaced still looks live to
        # gh-stack after the replacement merges, so the sync pushes a
        # branch GitHub has deleted and the whole push is rejected,
        # before the tidy below is ever reached. The fetch is what lets
        # stack-forget-merged.py see that such a branch is already in
        # the trunk; it leaves an ordinary merge for --prune to delete.
        git fetch origin --quiet || true

        # A stack whose every branch has merged is cleared here and not
        # handed to gh-stack, which cannot finish the job: the checkout is
        # on a merged branch, `main` is usually held by another worktree,
        # so it stays put, warns, and leaves the spent stack drawn.
        local cleared=0
        clear_spent || cleared=$?

        if [ "${cleared}" -ne 1 ]; then
            return "${cleared}"
        fi

        python3 "{{stack_scripts}}"/stack-forget-merged.py || return 1
        if ! gh stack sync --prune; then
            echo "  ✗ gh stack sync failed here; leaving this worktree alone." >&2

            # The usual cause, and one gh reports only as git's own
            # "cannot rebase: You have unstaged changes", which names
            # neither the files nor the way out. Asked after the failure
            # and not before: a sync with nothing to rebase is fine over
            # a dirty tree, and refusing it up front would be a new fault.
            local dirty=""
            dirty="$(git status --porcelain --untracked-files=no)"
            if [ -n "${dirty}" ]; then
                echo "    Uncommitted changes are in the way of the rebase, in:" >&2
                echo "${dirty}" | sed 's/^/      /' >&2
                echo "    Fold them into this branch's commit with \`just stu\`," >&2
                echo "    or put them aside with \`git stash\`, then sync again." >&2
            fi

            return 1
        fi

        # Asked again: the sync is what records a merge, so a stack whose
        # last pull request landed since the previous run is spent only now.
        cleared=0
        clear_spent || cleared=$?
        if [ "${cleared}" -ne 1 ]; then
            return "${cleared}"
        fi

        # `--prune` deletes the local branch of a merged pull request, which is
        # the half that frees the name - but it leaves the branch's entry in
        # the stack. Those entries are not only clutter: an entry whose branch
        # is gone costs `gh stack rebase` the base it should be rebasing onto,
        # and it replays the trunk's own history instead. So the record is
        # tidied here, where the branches were just deleted, rather than left
        # to surprise the next rebase.
        #
        # The record is shared by every worktree, so this tidies every
        # stack in it, leaving alone any branch checked out in a worktree.
        python3 "{{stack_scripts}}"/stack-forget-merged.py || return 1

        # A merge is when GitHub's stack drifts from this one: the merged
        # or closed pull request can stay in GitHub's stack and refuse
        # what is added after it. So it is checked now, and relinked if
        # it no longer matches. See `stack-relink`.
        local branches=""
        branches="$(python3 "{{stack_scripts}}"/stack-status.py --rebuild-order 2>/dev/null)" || branches=""

        # shellcheck disable=SC2086
        if [ -n "${branches}" ] && ! python3 "{{stack_scripts}}"/stack-relink.py --check ${branches} >/dev/null 2>&1; then
            echo "  GitHub's stack no longer matches this one; relinking it."
            python3 "{{stack_scripts}}"/stack-relink.py --repair ${branches} || return 1
        fi

        # Exit 1 means "no stack here". That is the ordinary ending for a sync
        # - the last branch merging deletes the stack, so the run that tidies
        # it up is the one guaranteed to find nothing left to draw. The
        # script's own message advises starting a new stack, which is not the
        # point here, so its output is held back and the outcome is reported
        # instead. Any other exit code is a real fault.
        local drawn=""
        local draw_status=0
        drawn=$(python3 "{{stack_scripts}}"/stack-status.py --prs --colour 2>&1) || draw_status=$?

        if [ "${draw_status}" -eq 0 ]; then
            printf '%s\n' "${drawn}"
        elif [ "${draw_status}" -eq 1 ]; then
            echo "  Stack fully merged - nothing left to draw."
        else
            printf '%s\n' "${drawn}" >&2
            return "${draw_status}"
        fi

        return 0
    }

    if [ "{{scope}}" != "a" ]; then
        sync_one "$(pwd)"
        exit $?
    fi

    # A sweep. This cascade-rebases and force-pushes in every worktree it visits, so it says
    # what it is about to do and names each worktree as it goes.
    ROOT=$(git rev-parse --path-format=absolute --git-common-dir)
    ROOT=$(dirname "${ROOT}")
    PARENT=$(dirname "${ROOT}")

    failed=0

    while IFS= read -r WT; do

        # Worktrees outside the checkout's own parent directory are not part
        # of the working set: agent sessions leave detached ones under
        # /private/tmp, and a sweep that force-pushed from one of those would
        # be acting on a checkout nobody is watching.
        case "${WT}" in
            "${PARENT}"/*) ;;
            *) continue ;;
        esac
        echo ""
        echo "▸ $(basename "${WT}")"

        # A subshell, so sync_one's `cd` cannot leak into the next iteration.
        ( sync_one "${WT}" ) || failed=1
    done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')

    if [ "${failed}" -ne 0 ]; then
        echo ""
        echo "✗ At least one worktree did not sync cleanly - see above." >&2
        exit 1
    fi


alias stu := stack-update
# Fold changes into this branch's last commit (message optional, to reword it)
stack-update message="":
    #!/usr/bin/env bash
    set -euo pipefail

    # The counterpart to stack-new, which creates a branch. This one revises the branch already checked out - the ordinary case when
    # a review comment, or a second pass over generated code, changes a unit
    # that already exists.
    #
    # It amends rather than adding a commit, because a stacked branch reads
    # best as one commit doing one thing: that is the unit being reviewed. A
    # branch that accumulates "fix: typo" on top of its real change is
    # harder to review. Amending keeps each branch to its single, finished
    # commit.
    #
    # Either way the branches above this one must be rebased afterwards, so
    # amending costs nothing extra: a plain commit leaves them behind just as
    # surely, only less visibly. `stack-rebase` is the repair, and
    # `stack-log` flags what still needs it.
    #
    # No stack guard: amending the branch you have checked out touches nothing
    # another worktree holds. `stack-submit` runs the guard when this work is
    # pushed - and pushes with --force-with-lease, which an amended branch
    # needs and a stack does on every submit anyway.
    if git diff --quiet && git diff --cached --quiet && \
       [ -z "$(git ls-files --others --exclude-standard)" ] && \
       [ -z "{{message}}" ]; then
        echo "Nothing to fold in - the working tree is clean." >&2
        echo "  Pass a message to reword the last commit on its own." >&2
        exit 1
    fi

    # -A to match stack-new: both stage everything, untracked files
    # included, so the two cannot differ in what they quietly leave behind.
    git add -A

    if [ -n "{{message}}" ]; then
        git commit --amend -m "{{message}}"
    else

        # --no-edit keeps the existing message rather than opening an editor,
        # which would hang anywhere non-interactive.
        git commit --amend --no-edit
    fi

    # Amending rewrote this commit, so the branches above must be rebased
    # onto the new one. Skipped only when --check exits 1 (not in a stack).
    # Exit 2 (stack spans worktrees) still goes to stack-rebase, which
    # refuses.
    stack_state=0
    python3 "{{stack_scripts}}"/stack-status.py --check >/dev/null 2>&1 || stack_state=$?

    if [ "${stack_state}" -eq 1 ]; then
        echo "  Amended. Not in a stack, so nothing above needs rebasing."
    else
        just stack-rebase
    fi


alias stw := stack-watch
# Redraw the stack with PR and CI state every minute; keys ready, sync, move, rebase, expand and open a file's diff
stack-watch:
    #!/usr/bin/env bash
    set +x

    # `stack-log-long` in a loop, once a minute. Not `watch(1)`: macOS does
    # not ship it.
    #
    # The dots run in the background and would outlive ctrl-c, so the
    # interrupt kills them by name.
    dots=""
    trap '[ -n "${dots}" ] && kill "${dots}" 2>/dev/null; echo; exit 130' INT TERM

    # A label, then a dot every two seconds, so a slow network call does
    # not look like a hang.
    start_dots() {
        printf '%s' "$1"
        ( while sleep 2; do printf '.'; done ) &
        dots=$!
    }

    # `wait` collects the job, so bash does not print a "Terminated" line
    # over whatever is drawn next.
    stop_dots() {
        if [ -n "${dots}" ]; then
            kill "${dots}" 2>/dev/null || true
            wait "${dots}" 2>/dev/null || true
            dots=""
        fi
    }

    # Whether `e` has expanded the branch checked out, listing its files.
    # While it is on, a digit opens a file rather than moving branch.
    expanded=0

    # Opening a file's diff changes nothing in the stack, so the drawing
    # already on screen is kept rather than fetched from GitHub again.
    refetch=1

    while true; do

        # The branch is read afresh each time, so moving branch with a
        # number moves the expansion with it. Spelt out so an empty array
        # expands to nothing: a bare "${expand[@]}" stops a Mac's bash 3.2
        # under `set -u`.
        expand=()

        if [ "${expanded}" -eq 1 ]; then
            expand=(--expand "$(git branch --show-current)")
        fi

        # Fetch first, then clear, so the old stack stays on screen during
        # the ~3s call.
        if [ "${refetch}" -eq 1 ]; then
            drawn=$(python3 "{{stack_scripts}}"/stack-status.py --prs --numbered --colour ${expand[@]+"${expand[@]}"} 2>&1 || true)
        fi

        refetch=1

        # Stop the dots a keypress started, further down.
        stop_dots

        # Home the cursor, clear the screen and clear the scrollback. Without
        # the last, a tall stack leaves its old copy above the new one.
        printf '\033[H\033[2J\033[3J'

        # The key letter in each word is bold bright blue (94). Plain blue
        # (34) is unreadable on a dark terminal.
        k='\033[1;94m'
        n='\033[0m'

        # What a digit does depends on whether the files are listed.
        picks="branch"

        if [ "${expanded}" -eq 1 ]; then
            picks="file"
        fi

        # The colour codes split each word at its key letter, which the
        # spelling check reads as fragments.
        # cspell:disable
        printf '%b\n' \
            "ready ${k}a${n}ll - ${k}s${n}ync - ${k}number${n} ${picks} - re${k}b${n}ase - re${k}f${n}resh - ${k}e${n}xpand - ${k}ctrl-c${n} to stop"

        # cspell:enable
        # Flush with the left edge, like the line above. stack-status.py
        # indents its drawing by two spaces for the other recipes.
        printf '%s\n' "${drawn}" | sed 's/^  //'

        # The minute's wait doubles as the keyboard: a is `stack-ready`, s is
        # `stack-sync`, a number is `stack-move`, b is `stack-rebase`, f
        # refreshes, and e lists the files the branch checked out changes,
        # or stops listing them. While they are listed, a number opens that
        # file side by side with its parent's copy, with `code --diff`.
        #
        # With no terminal on stdin `read` returns at once and the loop
        # would spin against GitHub, so that case just sleeps.
        if [ ! -t 0 ]; then
            sleep 60
            continue
        fi

        # Read one key silently, within what is left of the minute. A key
        # not listed is ignored. An escape starts an arrow or function key
        # sequence, whose tail can hold a listed key (page down ends in 6),
        # so the rest of it is drained.
        key=""
        deadline=$((SECONDS + 60))

        while true; do
            remaining=$((deadline - SECONDS))

            if [ "${remaining}" -le 0 ]; then
                key=""
                break
            fi

            pressed=0
            read -rsn1 -t "${remaining}" key || pressed=$?

            if [ "${pressed}" -ne 0 ]; then
                key=""
                break
            fi

            case "${key}" in
                a|A|s|S|[1-9]|b|B|f|F|e|E)
                    break
                    ;;
                $'\e')
                    while read -rsn1 -t 1 _; do :; done
                    ;;
            esac
        done

        if [ -z "${key}" ]; then
            continue
        fi

        # The dots started here run until the fetch at the top of the loop.
        echo ""

        case "${key}" in
            a|A)
                recipe=(stack-ready)
                start_dots "a · taking every pull request out of draft"
                ;;
            b|B)
                recipe=(stack-rebase)
                start_dots "b · rebasing the stack onto the trunk"
                ;;
            s|S)
                recipe=(stack-sync)
                start_dots "s · syncing the stack"
                ;;
            [1-9])

                # While the files are listed, a digit picks a file. The same
                # option that lists them says which, so the numbers on screen
                # and the one picked come from one reading of the branch.
                # With ten or more, wait 5s for a second digit, as for a
                # branch below.
                if [ "${expanded}" -eq 1 ]; then
                    pick=(python3 "{{stack_scripts}}"/stack-status.py ${expand[@]+"${expand[@]}"} --diff-at)
                    number="${key}"

                    if "${pick[@]}" "$((key * 10))" >/dev/null 2>&1; then
                        printf '%s · a second digit within 5s for %s0 and up, or any other key for file %s ' \
                            "${key}" "${key}" "${key}"
                        second=""
                        read -rsn1 -t 5 second || true
                        echo ""

                        case "${second}" in
                            [0-9]) number="${key}${second}" ;;
                        esac
                    fi

                    # The drawing on screen stays as it is whatever happens
                    # next: nothing in the stack has changed.
                    refetch=0

                    if ! sides="$("${pick[@]}" "${number}" 2>/dev/null)"; then
                        start_dots "${number} · there is no file ${number}"
                        continue
                    fi

                    # Two lines: the parent's copy, then the working file.
                    # vscode-code.sh finds the VS Code window this terminal
                    # belongs to, from a tmux window opened by `just tw` as
                    # well as from VS Code's own terminal, and runs `code`
                    # for it. When it cannot, or `code` fails, the message
                    # is shown and waits, since the redraw would wipe it.
                    left="${sides%%$'\n'*}"
                    right="${sides#*$'\n'}"
                    opened=0
                    opening=$(bash "{{stack_scripts}}"/vscode-code.sh --diff "${left}" "${right}" 2>&1) || opened=$?

                    if [ "${opened}" -ne 0 ]; then
                        printf '\n%s\n\n' "${opening}"
                        read -rsn1 -p "file ${number} did not open · any key to carry on" _ || true
                        echo ""
                        continue
                    fi

                    start_dots "${number} · opened file ${number} side by side with its parent"
                    continue
                fi

                # With ten or more branches, wait 5s for a second digit.
                # "Is there a branch ten times this one" says whether any
                # two-digit number starts with it.
                number="${key}"
                if python3 "{{stack_scripts}}"/stack-status.py --branch-at "$((key * 10))" >/dev/null 2>&1; then
                    printf '%s · a second digit within 5s for %s0 and up, or any other key for branch %s ' \
                        "${key}" "${key}" "${key}"
                    second=""
                    read -rsn1 -t 5 second || true
                    echo ""
                    case "${second}" in
                        [0-9]) number="${key}${second}" ;;
                    esac
                fi

                # No such branch, or already on it: say so in a line and
                # skip the recipe.
                if ! target="$(python3 "{{stack_scripts}}"/stack-status.py --branch-at "${number}" 2>/dev/null)"; then
                    start_dots "${number} · there is no branch ${number}"
                    continue
                fi

                if [ "${target}" = "$(git branch --show-current)" ]; then
                    start_dots "${number} · already on branch ${number}"
                    continue
                fi

                recipe=(stack-move "${number}")
                start_dots "${number} · checking out branch ${number}"
                ;;
            e|E)

                # A redraw, as f is, with the files listed or no longer.
                if [ "${expanded}" -eq 1 ]; then
                    expanded=0
                    start_dots "e · no longer listing the branch's files"
                else
                    expanded=1
                    start_dots "e · listing the branch's files"
                fi

                continue
                ;;
            *)

                # Only `f` reaches here: the read above drops the rest.
                start_dots "f · refreshing"
                continue
                ;;
        esac

        # Show the recipe's output only if it went wrong: a non-zero exit, or
        # a line saying work was not done. A warning about work that was
        # done does not stop the watcher. stack-watch-outcome.sh decides,
        # and says why.
        recipe_status=0
        recipe_output=$(just "${recipe[@]}" 2>&1) || recipe_status=$?
        if ! printf '%s\n' "${recipe_output}" \
            | bash "{{stack_scripts}}"/stack-watch-outcome.sh "${recipe_status}"; then
            recipe_status=1
        else
            recipe_status=0
        fi

        if [ "${recipe_status}" -ne 0 ]; then
            stop_dots
            printf '\n%s\n\n' "${recipe_output}"
            read -rsn1 -p "${recipe[*]} did not finish cleanly · any key to carry on" _ || true
            echo ""
            start_dots "refreshing"
        fi
    done


alias sb := storybook
# Start Storybook, the catalogue of shared components, on port 6006
storybook:
    @./s/frontend storybook


alias sbt := storybook-test
# Check every story with axe (WCAG 2.2 AA) in light and dark mode, as CI does
storybook-test:
    #!/usr/bin/env bash
    set -euo pipefail

    ./s/frontend build-storybook
    ./s/frontend test-storybook:ci
