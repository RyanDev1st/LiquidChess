"""Register Discord slash commands for HTTP Interactions mode."""

import argparse
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

from command_definitions import COMMANDS

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / "config" / "secrets.env")

BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
APP_ID = os.getenv("DISCORD_APP_ID")

if not BOT_TOKEN or not APP_ID:
    print("ERROR: Set DISCORD_BOT_TOKEN and DISCORD_APP_ID in app/backend/config/secrets.env")
    sys.exit(1)

API_URL = f"https://discord.com/api/v10/applications/{APP_ID}/commands"


def register_commands():
    """Register all slash commands with Discord."""
    headers = {
        "Authorization": f"Bot {BOT_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print(f"Registering {len(COMMANDS)} commands...")
    
    # Bulk overwrite global commands
    response = requests.put(API_URL, headers=headers, json=COMMANDS)
    
    if response.status_code == 200:
        commands_list = response.json()
        print(f"✅ Successfully registered {len(commands_list)} commands!")
        for cmd in commands_list:
            print(f"  - /{cmd['name']}")
    else:
        print(f"❌ Failed to register commands: {response.status_code}")
        print(response.text)
        return False
    
    return True


def list_commands():
    """List currently registered commands."""
    headers = {"Authorization": f"Bot {BOT_TOKEN}"}
    
    response = requests.get(API_URL, headers=headers)
    
    if response.status_code == 200:
        commands_list = response.json()
        print(f"📜 {len(commands_list)} commands registered:")
        for cmd in commands_list:
            print(f"  /{cmd['name']} - {cmd.get('description', 'No description')}")
    else:
        print(f"Failed to fetch commands: {response.status_code}")


def delete_commands():
    """Delete all global commands."""
    headers = {"Authorization": f"Bot {BOT_TOKEN}"}
    
    response = requests.put(API_URL, headers=headers, json=[])
    
    if response.status_code == 200:
        print("✅ All commands deleted")
    else:
        print(f"Failed to delete: {response.status_code}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage Discord slash commands")
    parser.add_argument("action", choices=["register", "list", "delete"], default="register", nargs="?", help="Action to perform")
    args = parser.parse_args()

    if args.action == "register":
        register_commands()
    elif args.action == "list":
        list_commands()
    elif args.action == "delete":
        delete_commands()
