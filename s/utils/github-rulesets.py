"""Validate GitHub ruleset identities before adopting repository settings."""

import json
import sys
from typing import Any


def rulesets(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError("Invalid ruleset response: expected an array")
    for item in value:
        if (
            not isinstance(item, dict)
            or type(item.get("id")) is not int
            or item["id"] <= 0
            or not isinstance(item.get("name"), str)
            or not item["name"].strip()
            or item.get("source_type") not in {"Repository", "Organization", "Enterprise"}
            or not isinstance(item.get("source"), str)
            or not item["source"].strip()
            or item.get("target") not in {"branch", "tag", "push", "repository"}
        ):
            raise ValueError("Invalid ruleset response: missing or invalid identity metadata")
    return value


def main(arguments: list[str]) -> None:
    value = json.load(sys.stdin)
    match arguments:
        case ["page-size"]:
            page = rulesets(value)
            if len(page) > 100:
                raise ValueError("Invalid ruleset response: more than 100 entries in one page")
            print(len(page))
        case ["flatten"]:
            if not isinstance(value, list):
                raise ValueError("Invalid ruleset response: expected pages")
            json.dump([item for page in value for item in rulesets(page)], sys.stdout)
        case ["find", name, repository]:
            matches = [
                item
                for item in rulesets(value)
                if item["name"] == name
                and item["source_type"] == "Repository"
                and item["source"] == repository
            ]
            if len(matches) > 1:
                raise ValueError(
                    f"Ambiguous ruleset name {name!r}; inspect GitHub before importing"
                )
            if matches and matches[0]["target"] != "branch":
                raise ValueError(
                    f"Ruleset {name!r} is not a branch ruleset; inspect before importing"
                )
            print(matches[0]["id"] if matches else "")
        case _:
            raise ValueError("Usage: github-rulesets.py <page-size|flatten|find NAME REPOSITORY>")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except (ValueError, TypeError) as error:
        print(f"{error}", file=sys.stderr)
        sys.exit(1)
