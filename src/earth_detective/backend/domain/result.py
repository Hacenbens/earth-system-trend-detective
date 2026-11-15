"""Result pattern: use cases return Ok(value) or Err(AppError) instead of raising for expected failures.

Exceptions are kept for programming errors and infrastructure faults; the HTTP layer turns those into a 500 Err.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from collections.abc import Callable, Iterable

from ..core.enums import ErrorKind  # re-exported for convenience
from typing import Any, Generic, TypeVar

T = TypeVar("T")
U = TypeVar("U")


@dataclass(frozen=True)
class AppError:
    kind: ErrorKind
    message: str
    details: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def not_found(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.NOT_FOUND, message, details)

    @classmethod
    def validation(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.VALIDATION, message, details)

    @classmethod
    def conflict(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.CONFLICT, message, details)

    @classmethod
    def not_available(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.NOT_AVAILABLE, message, details)

    @classmethod
    def unauthorized(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.UNAUTHORIZED, message, details)

    @classmethod
    def payload_too_large(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.PAYLOAD_TOO_LARGE, message, details)

    @classmethod
    def rate_limited(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.RATE_LIMITED, message, details)

    @classmethod
    def capacity(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.CAPACITY, message, details)

    @classmethod
    def unexpected(cls, message: str, **details) -> AppError:
        return cls(ErrorKind.UNEXPECTED, message, details)


@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T

    @property
    def is_ok(self) -> bool:
        return True

    def map(self, fn: Callable[[T], U]) -> Result[U]:
        return Ok(fn(self.value))

    def and_then(self, fn: Callable[[T], Result[U]]) -> Result[U]:
        return fn(self.value)

    def unwrap_or(self, default: T) -> T:
        return self.value


@dataclass(frozen=True)
class Err:
    error: AppError

    @property
    def is_ok(self) -> bool:
        return False

    def map(self, fn) -> Err:
        return self

    def and_then(self, fn) -> Err:
        return self

    def unwrap_or(self, default):
        return default


Result = Ok[T] | Err


def collect(results: Iterable[Result[T]]) -> "Result[list[T]]":
    """All Ok -> Ok(list of values); otherwise the first Err."""
    values = []
    for r in results:
        if not r.is_ok:
            return r
        values.append(r.value)
    return Ok(values)


def partition(results: Iterable[Result[T]]) -> tuple[list[T], list[AppError]]:
    """Split results into successes and errors (for batch operations that report partial failures)."""
    oks, errs = [], []
    for r in results:
        (oks.append(r.value) if r.is_ok else errs.append(r.error))
    return oks, errs
