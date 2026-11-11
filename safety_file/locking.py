"""Bounded, re-entrant POSIX advisory locks for a local safety-file repository.

The funded deployment is a local filesystem on a Linux VPS. All Turva writers
must participate; this is not a distributed/NFS lock or protection against an
administrator running Git outside Turva. A failed write is left for inspection,
not rolled back or silently attributed to the next person who saves.
"""

from __future__ import annotations

import fcntl
import threading
import time
from contextlib import contextmanager
from pathlib import Path

from .errors import RepositoryBusyError


class RepositoryLock:
    def __init__(self, root: Path) -> None:
        self.path = root / ".git" / "turva.lock"
        self.state = threading.local()

    @contextmanager
    def hold(self, *, exclusive: bool, timeout: float = 5):
        if getattr(self.state, "depth", 0):
            if exclusive and not self.state.exclusive:
                raise RuntimeError("Cannot write inside a read-only repository snapshot")
            self.state.depth += 1
            try:
                yield
            finally:
                self.state.depth -= 1
            return

        deadline = time.monotonic() + timeout
        with self.path.open("a+") as handle:
            operation = fcntl.LOCK_EX if exclusive else fcntl.LOCK_SH
            while True:
                try:
                    fcntl.flock(handle.fileno(), operation | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise RepositoryBusyError(
                            "This safety file is busy with another operation. Your draft has not "
                            "been saved; wait a moment and try again."
                        ) from None
                    time.sleep(min(0.05, remaining))
            self.state.depth = 1
            self.state.exclusive = exclusive
            try:
                yield
            finally:
                self.state.depth = 0
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
