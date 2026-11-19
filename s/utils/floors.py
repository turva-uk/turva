"""Validate a complete measurement scope, then publish monotonic floors atomically."""

import argparse
import fcntl
import os
import re
import stat
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MINIMUMS = ROOT / "s/floors/minimums"
MAX_BYTES = 1024 * 1024
IDENTIFIER = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*")
INTEGER = re.compile(r"0|[1-9][0-9]{0,11}")
FLOOR_ROW = re.compile(r"([a-z][a-z0-9]*(?:-[a-z0-9]+)*)[ \t]+([0-9]+)(?:[ \t]+#.*)?")


class FloorError(Exception):
    """No complete validated update is available."""


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise FloorError(message)


def bounded(stream) -> bytes:
    content = stream.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise FloorError("Floor data exceeds its 1 MiB limit.")
    return content


def measurements(content: bytes) -> dict[str, int]:
    result = {}
    for line in content.decode("utf-8").splitlines():
        fields = line.split()
        if len(fields) != 2 or not IDENTIFIER.fullmatch(fields[0]):
            raise FloorError("Each measurement must be one check identifier and one count.")
        check, value = fields
        if not INTEGER.fullmatch(value):
            raise FloorError(f"{check}: '{value[:60]}' is not a count.")
        if check in result:
            raise FloorError(f"{check}: duplicate measurement.")
        result[check] = int(value)
    if not result:
        raise FloorError("No counts were given, so nothing was checked.")
    return result


def floor_records(content: bytes):
    lines = content.decode("utf-8").splitlines(keepends=True)
    records = {}
    for index, line in enumerate(lines):
        value = line.strip()
        if not value or value.startswith("#"):
            continue
        match = FLOOR_ROW.fullmatch(value)
        if match is None or not INTEGER.fullmatch(match[2]) or int(match[2]) == 0:
            raise FloorError("Malformed record in s/floors/minimums; nothing was changed.")
        check, count = match[1], int(match[2])
        if check in records:
            raise FloorError(f"{check}: duplicate floor record; nothing was changed.")
        records[check] = (index, count)
    if not records:
        raise FloorError("No floor records exist in s/floors/minimums.")
    return lines, records


def publish(content: bytes, original: bytes, mode: int, directory: int) -> None:
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            dir=MINIMUMS.parent, prefix=".minimums-", delete=False
        ) as stream:
            temporary = Path(stream.name)
            os.fchmod(stream.fileno(), mode)
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        with MINIMUMS.open("rb") as stream:
            current = bounded(stream)
        if current != original:
            raise FloorError("The floor file changed during validation; inspect before retrying.")
        os.replace(temporary, MINIMUMS)
        temporary = None
        os.fsync(directory)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def apply(counts: dict[str, int], *, update: bool, raise_stale: bool) -> int:
    if MINIMUMS.is_symlink() or not MINIMUMS.is_file():
        raise FloorError("s/floors/minimums is missing or is not a regular file.")
    # Lock the stable parent directory: replacing the floor inode must not
    # invalidate another cooperating writer's lock. No persistent lock file.
    directory = os.open(MINIMUMS.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        fcntl.flock(directory, fcntl.LOCK_EX)
        with MINIMUMS.open("rb") as stream:
            original = bounded(stream)
            mode = stat.S_IMODE(os.fstat(stream.fileno()).st_mode)
        lines, records = floor_records(original)
        changes, messages, errors = {}, [], []
        for check, count in counts.items():
            old = records.get(check, (None, 0))[1]
            if not old and not update:
                errors.append(f"{check}: no floor in s/floors/minimums.")
            elif count < old or count == 0:
                errors.append(f"{check}: {count} is below its floor of {old or 1}.")
            elif update or (raise_stale and old * 10 < count * 7):
                floor = max(old, 1, count * 9 // 10)
                if floor > old:
                    changes[check] = floor
                    messages.append(
                        f"{check}: {count}, floor raised from {old} to {floor} in s/floors/minimums. Commit it with your change."
                    )
                else:
                    messages.append(f"{check}: {count}, floor {old} (never lowered).")
            elif old * 10 < count * 7:
                messages.append(
                    f"{check}: {count}, floor {old}, which is below 70% of the count. A local full run may raise it."
                )
            else:
                messages.append(f"{check}: {count}, floor {old}")
        if errors:
            # Report unaffected measurements too, but never claim an unapplied raise.
            for check, count in counts.items():
                if check in records and count >= records[check][1]:
                    print(f"{check}: {count}, floor {records[check][1]} (no changes applied)")
            raise FloorError("\n".join(errors))
        today = datetime.now(UTC).date().isoformat()
        for check, floor in changes.items():
            row = f"{check} {floor}  # 90% of {counts[check]}, measured {today}\n"
            if check in records:
                lines[records[check][0]] = row
            else:
                if lines and not lines[-1].endswith("\n"):
                    lines[-1] += "\n"
                lines.append(row)
        if changes:
            publish("".join(lines).encode("utf-8"), original, mode, directory)
        for message in messages:
            print(message)
        return 0
    finally:
        os.close(directory)


def main() -> int:
    try:
        if len(sys.argv) < 2 or sys.argv[1] not in ("check", "update"):
            raise FloorError("Usage: s/floors/<check|update> [--raise] [--expect CHECK ...]")
        operation = sys.argv[1]
        parser = Parser(prog=f"s/floors/{operation}", allow_abbrev=False)
        if operation == "check":
            parser.add_argument("--raise", dest="raise_stale", action="store_true")
        parser.add_argument("--expect", nargs="+")
        args = parser.parse_args(sys.argv[2:])
        counts = measurements(bounded(sys.stdin.buffer))
        if args.expect is not None:
            if (
                any(not IDENTIFIER.fullmatch(check) for check in args.expect)
                or len(set(args.expect)) != len(args.expect)
                or set(counts) != set(args.expect)
            ):
                raise FloorError("Measurements do not match the complete expected scope.")
        return apply(
            counts, update=operation == "update", raise_stale=getattr(args, "raise_stale", False)
        )
    except (FloorError, OSError, ValueError) as error:
        print(
            str(error)
            if isinstance(error, FloorError)
            else f"Could not validate or publish floor data ({type(error).__name__}).",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
