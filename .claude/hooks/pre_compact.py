#!/usr/bin/env python3
"""
PreCompact hook.

Fires before Claude Code compacts the conversation context.
Writes a sidecar snapshot (.precompact.md) — separate from the real
session snapshot — so the real snapshot is never overwritten with a
partial mid-session state.

If the session ends normally, the real Stop/SessionEnd snapshot is
canonical. The .precompact.md file is just insurance: readable if
something goes wrong during a long session.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _memory_lib import load_state, memory_root, read_events


def main():
    # Read stdin (required by hook protocol) but we don't need the payload
    try:
        sys.stdin.read()
    except Exception:
        pass

    state = load_state()
    sid = state.get("last_session_id")
    if not sid:
        return

    events = read_events()
    if not events:
        return

    # Build a minimal sidecar — just enough to reconstruct state if needed
    lines = [
        f"# Pre-Compaction Snapshot — {sid}",
        f"- **Saved at:** {datetime.now().isoformat()}",
        f"- **Events captured so far:** {len(events)}",
        "",
        "## Events captured before compaction",
        "",
    ]

    # Bucket events by kind for a quick readable summary
    prompts = [e.get("text", "") for e in events if e.get("kind") == "user_prompt"]
    files = [e.get("path", "") for e in events if e.get("kind") == "file_change"]
    bash = [e.get("command", "") for e in events if e.get("kind") == "bash" and e.get("tags")]

    if prompts:
        lines.append("### User prompts (first → last)")
        for p in prompts:
            lines.append(f"- {p[:200]}")
        lines.append("")

    if files:
        lines.append("### Files changed")
        for f in sorted(set(files)):
            lines.append(f"- `{f}`")
        lines.append("")

    if bash:
        lines.append("### Notable commands")
        for b in bash:
            lines.append(f"- `{b}`")
        lines.append("")

    lines.append("> Sidecar only — real snapshot written at session end by Stop/SessionEnd hook.")

    sidecar_path = memory_root() / "snapshots" / f".{sid}.precompact.md"
    sidecar_path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
