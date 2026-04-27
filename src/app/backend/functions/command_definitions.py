"""Discord slash command payloads."""

COMMANDS = [
    {"name": "ping", "description": "Check if Count Lucian is awake", "type": 1},
    {"name": "help", "description": "Display Count Lucian's command grimoire", "type": 1},
    {
        "name": "info",
        "description": "Guild information commands",
        "type": 1,
        "options": [
            {
                "name": "show",
                "description": "Display information about a topic",
                "type": 1,
                "options": [
                    {
                        "name": "topic",
                        "description": "The topic to display",
                        "type": 3,
                        "required": True,
                        "choices": [
                            {"name": "Schedule", "value": "schedule"},
                            {"name": "Officers", "value": "officers"},
                            {"name": "Rules", "value": "rules"},
                            {"name": "Resources", "value": "resources"},
                            {"name": "Events", "value": "events"},
                        ],
                    }
                ],
            },
            {
                "name": "add",
                "description": "(Admin) Add information entry",
                "type": 1,
                "options": [
                    {"name": "topic", "description": "The topic category", "type": 3, "required": True},
                    {"name": "content", "description": "The information content", "type": 3, "required": True},
                ],
            },
            {
                "name": "remove",
                "description": "(Admin) Remove information entry",
                "type": 1,
                "options": [
                    {"name": "topic", "description": "The topic to remove", "type": 3, "required": True},
                    {"name": "index", "description": "Index of entry to remove", "type": 4, "required": True},
                ],
            },
        ],
    },
    {
        "name": "match",
        "description": "Matchmaking commands for chess games",
        "type": 1,
        "options": [
            {
                "name": "request",
                "description": "Request a chess match (requires ELO verification)",
                "type": 1,
                "options": [
                    {"name": "opponent", "description": "Specific user to challenge (optional)", "type": 6, "required": False},
                    {
                        "name": "time_control",
                        "description": "Time control for the match",
                        "type": 3,
                        "required": False,
                        "choices": [
                            {"name": "Bullet (1+0)", "value": "bullet"},
                            {"name": "Blitz (3+0)", "value": "blitz"},
                            {"name": "Rapid (10+0)", "value": "rapid"},
                            {"name": "Classical (30+0)", "value": "classical"},
                        ],
                    },
                ],
            },
            {"name": "list", "description": "View active match requests", "type": 1},
            {
                "name": "accept",
                "description": "Accept a match request",
                "type": 1,
                "options": [
                    {"name": "index", "description": "Index of the match request to accept", "type": 4, "required": True}
                ],
            },
            {"name": "cancel", "description": "Cancel your match request", "type": 1},
        ],
    },
    {
        "name": "work",
        "description": "Guild task management",
        "type": 1,
        "options": [
            {"name": "list", "description": "View pending guild tasks", "type": 1},
            {
                "name": "claim",
                "description": "Claim a task",
                "type": 1,
                "options": [{"name": "id", "description": "Task ID to claim", "type": 4, "required": True}],
            },
            {
                "name": "complete",
                "description": "Mark a task as complete",
                "type": 1,
                "options": [{"name": "id", "description": "Task ID to complete", "type": 4, "required": True}],
            },
        ],
    },
    {
        "name": "meme",
        "description": "Entertainment commands",
        "type": 1,
        "options": [
            {"name": "now", "description": "Summon a random meme", "type": 1},
            {
                "name": "auto",
                "description": "Start automatic meme posting",
                "type": 1,
                "options": [
                    {
                        "name": "category",
                        "description": "Meme category",
                        "type": 3,
                        "required": True,
                        "choices": [
                            {"name": "Chess", "value": "chess"},
                            {"name": "General", "value": "general"},
                            {"name": "Random", "value": "random"},
                        ],
                    },
                    {"name": "interval", "description": "Seconds between memes", "type": 4, "required": False},
                ],
            },
            {"name": "stop", "description": "Stop automatic meme posting", "type": 1},
        ],
    },
    {
        "name": "verify",
        "description": "(Admin) Manually verify a user's ELO",
        "type": 1,
        "default_member_permissions": "8",
        "options": [
            {"name": "user", "description": "The user to verify", "type": 6, "required": True},
            {"name": "elo", "description": "Their ELO rating", "type": 4, "required": True},
            {"name": "link", "description": "Their chess profile URL", "type": 3, "required": False},
        ],
    },
    {
        "name": "roast",
        "description": "Roast a user (with consent)",
        "type": 1,
        "options": [{"name": "user", "description": "The user to roast", "type": 6, "required": True}],
    },
]
