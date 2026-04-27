"""Tracing - OpenTelemetry instrumentation for LiquidChess.

Provides distributed tracing for debugging and performance monitoring.
"""

from __future__ import annotations

import logging
from typing import Any, Optional


# Default OTLP endpoint (AI Toolkit)
DEFAULT_OTLP_ENDPOINT = "http://localhost:4318/v1/traces"


def setup_tracing(
    service_name: str = "liquidchess",
    otlp_endpoint: str = DEFAULT_OTLP_ENDPOINT,
    enable: bool = True
) -> Optional[Any]:
    """Set up OpenTelemetry tracing for the application.
    
    Args:
        service_name: Name of the service for trace identification.
        otlp_endpoint: OTLP endpoint URL (default: AI Toolkit localhost).
        enable: Whether to enable tracing.
        
    Returns:
        Configured tracer instance, or None if disabled.
    """
    if not enable:
        return None

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.aiohttp_client import AioHttpClientInstrumentor
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except Exception as exc:
        logging.warning(f"Failed to set up tracing: {exc}")
        return None

    try:
        # Create resource with service name
        resource = Resource(attributes={
            "service.name": service_name,
            "service.version": "1.0.0"
        })
        
        # Set up tracer provider
        provider = TracerProvider(resource=resource)
        
        # Configure OTLP exporter
        otlp_exporter = OTLPSpanExporter(
            endpoint=otlp_endpoint,
            timeout=10
        )
        
        # Add batch span processor
        span_processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(span_processor)
        
        # Set as global tracer provider
        trace.set_tracer_provider(provider)
        
        # Instrument HTTP clients automatically
        AioHttpClientInstrumentor().instrument()
        RequestsInstrumentor().instrument()
        
        # Get tracer instance
        tracer = trace.get_tracer(__name__)
        
        logging.info(f"Tracing enabled: {service_name} -> {otlp_endpoint}")
        
        return tracer

    except Exception as e:
        logging.warning(f"Failed to set up tracing: {e}")
        return None


def shutdown_tracing() -> None:
    """Shutdown tracing and flush remaining spans."""
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
    except Exception:
        return

    try:
        provider = trace.get_tracer_provider()
        if isinstance(provider, TracerProvider):
            provider.shutdown()
            logging.info("Tracing shutdown complete")
    except Exception as e:
        logging.warning(f"Error during tracing shutdown: {e}")
