#!/usr/bin/env python3
"""PostToolUse (Write/Edit/MultiEdit) — events + token capture."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _memory_lib import (
    read_hook_input, log_event, scan_for_secret_refs, note_secret_refs,
)


def main():
    payload = read_hook_input()
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input", {}) or {}
    tool_response = payload.get("tool_response", {}) or {}

    file_path = tool_input.get("file_path") or tool_input.get("path") or "(unknown)"
    success = bool(tool_response.get("success", True))

    if tool_name == "Write":
        action = "write"
        file_content = tool_input.get("content", "")
    elif tool_name == "Edit":
        action = "edit"
        file_content = tool_input.get("new_string", "")
    elif tool_name == "MultiEdit":
        action = "multi_edit"
        edits = tool_input.get("edits", []) or []
        file_content = "\n".join(e.get("new_string", "") for e in edits)
    else:
        action = tool_name.lower() or "unknown"
        file_content = ""

    log_event({
        "kind": "file_change",
        "action": action,
        "path": file_path,
        "success": success,
    })

    if file_content:
        refs = scan_for_secret_refs(file_content)
        if refs:
            note_secret_refs(refs)



if __name__ == "__main__":
    main()
