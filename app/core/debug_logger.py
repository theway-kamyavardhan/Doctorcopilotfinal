from datetime import UTC, datetime
from pathlib import Path


DEBUG_FILE_PATH = Path(__file__).resolve().parents[2] / "debug.txt"


def append_debug_event(section: str, message: str) -> None:
    timestamp = datetime.now(UTC).isoformat()
    DEBUG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DEBUG_FILE_PATH.open("a", encoding="utf-8") as handle:
        handle.write(f"[{timestamp}] {section}: {message}\n")


def write_debug_report(content: str) -> None:
    DEBUG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEBUG_FILE_PATH.write_text(content, encoding="utf-8")
