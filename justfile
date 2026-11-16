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
# Go to the turva Claude session in tmux, starting it or Claude again if needed (dev box)
claude-session:
    #!/usr/bin/env bash
    # Take this terminal to the turva Claude session on the dev box, with
    # Claude running in it, whatever state either is in. This:
    #
    #   - starts the session, with Claude in it, when there is none;
    #   - starts Claude again in it when Claude has exited and left the shell;
    #   - attaches from outside tmux, or switches from another session.
    #
    # Claude started here gets --ide, which links it to the VS Code window
    # open on the dev box; a Claude already running cannot be linked from
    # outside, so type /ide in it instead.

    set -euo pipefail

    if ! command -v tmux > /dev/null; then
        echo "✗ tmux is not installed. This is for the dev box." >&2
        exit 1
    fi

    top={{quote(justfile_directory())}}
    name="turva"
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
# Go to a plain shell in tmux for this repo, starting it if needed; `just tw 2` for a second
tmux-window NUMBER="":
    #!/usr/bin/env bash
    # Take this terminal to a plain shell in tmux for this repo, so a command
    # run there outlives the terminal that started it.
    #
    # The session is t-turva, beside turva, which holds Claude. A number gives
    # another one: `just tw 2` is t-turva-2, and `just tw 2` again comes back
    # to it. This starts the session, with a login shell in the repo, when
    # there is none, then attaches from outside tmux or switches from another
    # session.

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
        echo "✗ tmux is not installed. This is for the dev box." >&2
        exit 1
    fi

    top={{quote(justfile_directory())}}
    name="t-turva"

    if [ -n "${number}" ]; then
        name="${name}-${number}"
    fi

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
