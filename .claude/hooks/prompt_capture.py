#!/usr/bin/env python3
"""UserPromptSubmit hook (v2). Records each prompt as a structured event."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _memory_lib import read_hook_input, log_event, scan_for_secret_refs, note_secret_refs


def main():
    payload = read_hook_input()
    prompt = payload.get("prompt", "")
    if not prompt:
        return
    # Cap stored prompt length — the snapshot only needs the gist
    short = prompt if len(prompt) <= 400 else prompt[:400] + "…"
    log_event({"kind": "user_prompt", "text": short})
    refs = scan_for_secret_refs(prompt)
    if refs:
        note_secret_refs(refs)


if __name__ == "__main__":
    main()
