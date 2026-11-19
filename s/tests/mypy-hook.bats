#!/usr/bin/env bats
# Keep the type checker's declared runtime/test versions aligned with the
# application locks, and its production/test-body checks enabled. No tool runs
# or packages are installed here; the normal hook executes mypy separately.

@test "the mypy environment declares each storage and test dependency at its locked version" {
	run python3 - "${BATS_TEST_DIRNAME}/../.." <<'PY'
from pathlib import Path
import re, sys, yaml
root = Path(sys.argv[1])
manifest = yaml.safe_load((root / '.pre-commit-config.yaml').read_text())
hook = next(hook for repo in manifest['repos'] for hook in repo['hooks'] if hook['id'] == 'mypy')
locked = dict(re.findall(r'^([a-z0-9-]+)==([^\s]+)$', (root / 'app/requirements.dev.txt').read_text(), re.M))
declared = dict(package.lower().split('==', 1) for package in hook['additional_dependencies'])
for package in ('jinja2', 'markupsafe', 'pyyaml', 'pytest'):
    assert declared.get(package) == locked[package], (package, declared.get(package), locked[package])
assert 'types-pyyaml' in declared
PY
	[ "$status" -eq 0 ]
}

@test "strict production typing and unannotated test-body checking remain enabled" {
	run python3 - "${BATS_TEST_DIRNAME}/../.." <<'PY'
from pathlib import Path
import sys, tomllib
config = tomllib.loads((Path(sys.argv[1]) / 'pyproject.toml').read_text())['tool']['mypy']
assert config['strict'] is True and config['files'] == ['safety_file']
overrides = config['overrides']
assert len(overrides) == 1 and overrides[0]['module'] == 'safety_file.tests.*'
assert overrides[0]['check_untyped_defs'] is True
assert not config.get('ignore_errors', False) and not overrides[0].get('ignore_errors', False)
PY
	[ "$status" -eq 0 ]
}
