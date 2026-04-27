"""Shared constants and helpers for Discord interaction handling."""

PING = 1
APPLICATION_COMMAND = 2
MESSAGE_COMPONENT = 3

PONG = 1
CHANNEL_MESSAGE = 4
DEFERRED_CHANNEL_MESSAGE = 5
UPDATE_MESSAGE = 7


def lucian_speak(text: str) -> str:
    """Wrap text in Count Lucian's aristocratic voice."""
    return f"🧛 *{text}*"
