"""Firebase Cloud Functions - LiquidChess Discord Bot."""

from __future__ import annotations

import json
import logging

from firebase_admin import initialize_app
from firebase_functions import https_fn
from firebase_functions.options import CorsOptions, MemoryOption
from flask import Flask, jsonify, request

from handlers import dispatch_interaction
from signature import verify_discord_signature

initialize_app()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("liquidchess")

app = Flask(__name__)


def _reject_invalid_signature(raw_body: bytes, signature: str, timestamp: str):
    if verify_discord_signature(raw_body, signature, timestamp):
        return None
    return "Invalid signature", 401


def _json_response(payload: dict) -> str:
    return json.dumps(payload)


@app.route("/discord", methods=["POST"])
def discord_webhook():
    """Handle Discord interactions in local development."""
    rejection = _reject_invalid_signature(
        request.data,
        request.headers.get("X-Signature-Ed25519", ""),
        request.headers.get("X-Signature-Timestamp", ""),
    )
    if rejection:
        return rejection
    return jsonify(dispatch_interaction(request.json or {}))


@https_fn.on_request(cors=CorsOptions(cors_origins="*", cors_methods=["POST"]), memory=MemoryOption.MB_256, timeout_sec=30)
def discord_interactions(req: https_fn.Request) -> https_fn.Response:
    """Firebase Cloud Function for Discord interactions."""
    if not verify_discord_signature(
        req.data,
        req.headers.get("X-Signature-Ed25519", ""),
        req.headers.get("X-Signature-Timestamp", ""),
    ):
        return https_fn.Response("Invalid signature", status=401)

    try:
        body = req.get_json()
    except Exception as exc:
        logger.error("Failed to parse JSON: %s", exc)
        return https_fn.Response("Invalid JSON", status=400)

    return https_fn.Response(_json_response(dispatch_interaction(body)), content_type="application/json")


@https_fn.on_request(cors=CorsOptions(cors_origins="*", cors_methods=["GET", "POST"]))
def api(req: https_fn.Request) -> https_fn.Response:
    """API endpoint for the web dashboard."""
    path = req.path.replace("/api", "").strip("/")
    if path == "health":
        payload = {"status": "ok", "service": "liquidchess"}
    elif path == "status":
        payload = {"bot": "online", "version": "1.0.0", "mode": "serverless"}
    else:
        return https_fn.Response(_json_response({"error": "Not found"}), status=404, content_type="application/json")
    return https_fn.Response(_json_response(payload), content_type="application/json")


if __name__ == "__main__":
    print("Starting local development server...")
    print("Test endpoint: http://localhost:8080/discord")
    app.run(host="0.0.0.0", port=8080, debug=True)
