"""Discord interaction routing and canned command responses."""

from __future__ import annotations

import logging

from constants import (
    APPLICATION_COMMAND,
    CHANNEL_MESSAGE,
    DEFERRED_CHANNEL_MESSAGE,
    MESSAGE_COMPONENT,
    PING,
    PONG,
    UPDATE_MESSAGE,
    lucian_speak,
)

logger = logging.getLogger("liquidchess")


def handle_ping() -> dict:
    """Handle Discord PING request for endpoint verification."""
    return {"type": PONG}


def handle_slash_command(data: dict) -> dict:
    """Route slash commands to appropriate handlers."""
    command_name = data.get("name", "")
    options_list = data.get("options", [])
    options_dict = {opt["name"]: opt.get("value") for opt in options_list}
    subcommand = None

    if options_list and options_list[0].get("type") == 1:
        subcommand = options_list[0]["name"]
        sub_options = options_list[0].get("options", [])
        options_dict = {opt["name"]: opt.get("value") for opt in sub_options}

    logger.info("Command: %s, Subcommand: %s, Options: %s", command_name, subcommand, options_dict)
    handlers = {
        "ping": cmd_ping,
        "info": cmd_info,
        "match": cmd_match,
        "work": cmd_work,
        "meme": cmd_meme,
        "help": cmd_help,
    }
    return handlers.get(command_name, cmd_unknown)(subcommand, options_dict, data)


def cmd_ping(subcommand: str | None, options: dict, data: dict) -> dict:
    return {"type": CHANNEL_MESSAGE, "data": {"content": lucian_speak("The blood flows... I am awake."), "flags": 64}}


def cmd_help(subcommand: str | None, options: dict, data: dict) -> dict:
    help_text = """**🧛 Count Lucian's Command Grimoire**

**Arena Commands**
`/match request` - Request a chess match (requires ELO verification)
`/match list` - View active match requests
`/match accept` - Accept a match request

**Guild Commands**
`/info show <topic>` - View club information
`/work list` - View pending tasks
`/work <id>` - Claim a task

**Entertainment**
`/meme now` - Summon a meme
`/roast @user` - Roast someone (with consent)

*The night is young, mortal. Choose wisely.*
"""
    return {
        "type": CHANNEL_MESSAGE,
        "data": {"embeds": [{"title": "📜 Command Grimoire", "description": help_text, "color": 0xDAA520}]},
    }


def cmd_info(subcommand: str | None, options: dict, data: dict) -> dict:
    if subcommand == "show":
        topic = options.get("topic", "general")
        return {
            "type": CHANNEL_MESSAGE,
            "data": {
                "content": lucian_speak(f"Displaying information about: **{topic}**"),
                "embeds": [{"title": f"📋 {topic.title()}", "description": "Information will be fetched from database...", "color": 0xDAA520}],
            },
        }
    return {"type": CHANNEL_MESSAGE, "data": {"content": lucian_speak("Use `/info show <topic>` to view information.")}}


def cmd_match(subcommand: str | None, options: dict, data: dict) -> dict:
    user = data.get("member", {}).get("user", {})
    username = user.get("username", "Unknown")

    if subcommand == "request":
        return {
            "type": DEFERRED_CHANNEL_MESSAGE,
            "data": {"content": lucian_speak(f"**{username}** seeks worthy opposition... Scanning for ELO verification.")},
        }
    if subcommand == "list":
        return {
            "type": CHANNEL_MESSAGE,
            "data": {"embeds": [{"title": "⚔️ Active Match Requests", "description": "No active requests in the arena.", "color": 0x8B0000}]},
        }
    if subcommand == "accept":
        return {"type": CHANNEL_MESSAGE, "data": {"content": lucian_speak(f"Accepting match request #{options.get('index', 1)}...")}}
    return {"type": CHANNEL_MESSAGE, "data": {"content": lucian_speak("Unknown match subcommand.")}}


def cmd_work(subcommand: str | None, options: dict, data: dict) -> dict:
    if subcommand in ("list", None):
        return {
            "type": CHANNEL_MESSAGE,
            "data": {"embeds": [{"title": "📋 Guild Tasks", "description": "The task board stands empty... for now.", "color": 0xDAA520}]},
        }
    return {"type": CHANNEL_MESSAGE, "data": {"content": lucian_speak("Use `/work list` to view tasks.")}}


def cmd_meme(subcommand: str | None, options: dict, data: dict) -> dict:
    if subcommand == "now":
        return {
            "type": CHANNEL_MESSAGE,
            "data": {
                "content": lucian_speak("*conjures entertainment from the void*"),
                "embeds": [{"title": "🎭 Meme Summoned", "description": "Connect Google Drive for custom memes!", "color": 0x9932CC}],
            },
        }
    return {"type": CHANNEL_MESSAGE, "data": {"content": lucian_speak("Use `/meme now` to summon entertainment.")}}


def cmd_unknown(subcommand: str | None, options: dict, data: dict) -> dict:
    return {"type": CHANNEL_MESSAGE, "data": {"content": lucian_speak("This incantation is unknown to me..."), "flags": 64}}


def dispatch_interaction(body: dict) -> dict:
    """Dispatch an incoming Discord interaction payload."""
    interaction_type = body.get("type")
    logger.info("Received interaction type: %s", interaction_type)
    if interaction_type == PING:
        return handle_ping()
    if interaction_type == APPLICATION_COMMAND:
        return handle_slash_command(body.get("data", {}))
    if interaction_type == MESSAGE_COMPONENT:
        return {"type": UPDATE_MESSAGE, "data": {"content": lucian_speak("Component interaction received.")}}
    return {"type": PONG}
