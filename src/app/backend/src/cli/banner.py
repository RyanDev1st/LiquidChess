"""Terminal presentation helpers for the LiquidChess CLI."""


def print_banner() -> None:
    """Print the LiquidChess banner."""
    banner = """
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   🧛  L I Q U I D C H E S S  🧛                          ║
    ║                                                           ║
    ║   "I have watched empires rise and fall on 64 squares.    ║
    ║    Your game... amuses me."                               ║
    ║                                           - Count Lucian  ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """
    print(banner)
