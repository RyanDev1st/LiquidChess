"""Regression tests for CLI startup and optional tracing dependencies."""

from __future__ import annotations

import builtins
import importlib
import logging
import sys
from types import ModuleType


OPTIONAL_TRACING_IMPORTS = (
    "opentelemetry.exporter.otlp.proto.http.trace_exporter",
    "opentelemetry.instrumentation.aiohttp_client",
    "opentelemetry.instrumentation.requests",
)


def _clear_modules(*module_names: str) -> None:
    for name in module_names:
        sys.modules.pop(name, None)


def _patch_optional_import_failure(monkeypatch) -> None:
    original_import = builtins.__import__

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        if any(name.startswith(prefix) for prefix in OPTIONAL_TRACING_IMPORTS):
            raise ImportError(f"blocked optional import: {name}")
        return original_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", guarded_import)


def test_cli_runtime_import_is_safe_when_tracing_dependencies_fail(monkeypatch):
    """Importing the CLI runtime should not require tracing dependencies."""
    _patch_optional_import_failure(monkeypatch)
    _clear_modules("src.cli.runtime", "src.utils", "src.utils.tracing")

    runtime = importlib.import_module("src.cli.runtime")

    assert isinstance(runtime, ModuleType)
    assert callable(runtime.main)
    assert callable(runtime.run)


def test_setup_tracing_returns_none_when_optional_dependency_import_fails(monkeypatch, caplog):
    """Tracing setup should degrade to a warning when OTEL extras are unavailable."""
    _patch_optional_import_failure(monkeypatch)
    _clear_modules("src.utils.tracing")

    tracing = importlib.import_module("src.utils.tracing")

    with caplog.at_level(logging.WARNING):
        tracer = tracing.setup_tracing(service_name="liquidchess-test", enable=True)

    assert tracer is None
    assert "Failed to set up tracing" in caplog.text
