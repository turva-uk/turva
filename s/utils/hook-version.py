"""Extract one validated release pin from this checkout's pre-commit manifest."""

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print(
        "PyYAML is required to read hook pins. Install it explicitly with your Python's pip using '-c app/requirements.txt PyYAML'; no packages were installed.",
        file=sys.stderr,
    )
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 1024 * 1024
RELEASE = re.compile(r"v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)")


class PinLoader(yaml.SafeLoader):
    """Bound composition and reject duplicate keys instead of selecting one."""

    def __init__(self, stream: bytes) -> None:
        super().__init__(stream)
        self.depth = 0
        self.nodes = 0

    def compose_node(self, parent, index):
        self.depth += 1
        self.nodes += 1
        try:
            if self.depth > 40 or self.nodes > 20_000 or self.check_event(yaml.AliasEvent):
                raise ValueError("YAML exceeds the supported structure or uses aliases")
            return super().compose_node(parent, index)
        finally:
            self.depth -= 1

    def construct_mapping(self, node, deep=False):
        mapping = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if not isinstance(key, str) or key in mapping:
                raise ValueError("mapping keys must be unique strings")
            if key == "rev" and (
                not isinstance(value_node, yaml.ScalarNode)
                or value_node.style in ("|", ">")
                or value_node.start_mark.line != value_node.end_mark.line
            ):
                raise ValueError("revision must be one single-line scalar")
            mapping[key] = self.construct_object(value_node, deep=deep)
        return mapping


def release(repository: str) -> str:
    with (ROOT / ".pre-commit-config.yaml").open("rb") as stream:
        content = stream.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise ValueError("manifest is oversized")
    manifest = yaml.load(content, Loader=PinLoader)
    if not isinstance(manifest, dict) or not isinstance(manifest.get("repos"), list):
        raise ValueError("manifest needs a repos list")
    records = manifest["repos"]
    if any(
        not isinstance(record, dict) or not isinstance(record.get("repo"), str)
        for record in records
    ):
        raise ValueError("repository records must be mappings with string identities")
    matches = [record for record in records if record["repo"] == repository]
    if len(matches) != 1:
        raise ValueError("expected exactly one matching repository")
    version = matches[0].get("rev")
    if not isinstance(version, str) or len(version) > 100 or RELEASE.fullmatch(version) is None:
        raise ValueError("expected a complete release version")
    return version.removeprefix("v")


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1]:
        print(
            "No repository given or invalid arguments. Usage: s/checks/hook-version <repository URL>",
            file=sys.stderr,
        )
        return 1
    try:
        version = release(sys.argv[1])
    except (OSError, ValueError, yaml.YAMLError, RecursionError) as error:
        # Configuration and parser errors can contain arbitrary multiline values.
        # Never echo them into public logs or a workflow output command.
        print(
            f"Could not read a unique release pin from .pre-commit-config.yaml ({type(error).__name__}).",
            file=sys.stderr,
        )
        return 1
    print(version)
    return 0


if __name__ == "__main__":
    sys.exit(main())
