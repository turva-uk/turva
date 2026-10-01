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
