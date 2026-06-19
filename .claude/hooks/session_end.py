#!/usr/bin/env python3
"""
Stop / SessionEnd hook (v2).

Reads the structured event stream and emits a SUMMARY snapshot — not a raw
transcript. The reader should grok the whole session in under a minute.

Idempotent: re-running on the same session rewrites the same snapshot file.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _memory_lib import (
    read_hook_input, load_state, memory_root, read_events,
)


def summarize_events(events: list[dict]) -> dict:
    """Bucket the raw events into summary categories."""
    prompts = [e["text"] for e in events if e.get("kind") == "user_prompt"]

    files_written, files_edited, files_multi = [], [], []
    for e in events:
        if e.get("kind") != "file_change":
            continue
        path = e.get("path", "(unknown)")
        if e.get("action") == "write":
            files_written.append(path)
        elif e.get("action") == "edit":
            files_edited.append(path)
        elif e.get("action") == "multi_edit":
            files_multi.append(path)

    by_tag: dict[str, list[str]] = {}
    untagged_bash = []
    for e in events:
        if e.get("kind") != "bash":
            continue
        cmd = e.get("command", "")
        tags = e.get("tags") or []
        if not tags:
            untagged_bash.append(cmd)
        for t in tags:
            by_tag.setdefault(t, []).append(cmd)

    secret_names: dict[str, set] = {}
    for e in events:
        if e.get("kind") != "secret_refs":
            continue
        for r in e.get("refs", []):
            secret_names.setdefault(r["kind"], set()).add(r["name"])

    failed_commands = [
        e.get("command", "") for e in events
        if e.get("kind") == "bash" and e.get("failed")
    ]

    return {
        "prompts": prompts,
        "files_written": sorted(set(files_written)),
        "files_edited": sorted(set(files_edited)),
        "files_multi": sorted(set(files_multi)),
        "by_tag": {k: sorted(set(v)) for k, v in by_tag.items()},
        "untagged_bash": untagged_bash,
        "secrets": {k: sorted(v) for k, v in secret_names.items()},
        "failed_commands": failed_commands,
    }


def render_snapshot(session_id: str, day: int, sess_num: int, s: dict,
                    opened: str, closed: str) -> str:
    lines: list[str] = []
    lines.append(f"# Session Summary — {session_id}")
    lines.append("")
    lines.append(f"- **Day:** {day}    **Session #:** {sess_num}")
    lines.append(f"- **Opened:** {opened}    **Closed:** {closed}")
    lines.append("")

    # Session goal — first prompt is usually the intent
    lines.append("## Session goal")
    if s["prompts"]:
        lines.append(f"- {s['prompts'][0]}")
        if len(s["prompts"]) > 1:
            lines.append(f"- (+ {len(s['prompts']) - 1} follow-up prompt"
                         f"{'s' if len(s['prompts']) > 1 else ''})")
    else:
        lines.append("- _(no user prompts captured)_")
    lines.append("")

    # What changed (summarized)
    lines.append("## What changed")
    bullets: list[str] = []
    for f in s["files_written"]:
        bullets.append(f"created/overwrote `{f}`")
    for f in s["files_edited"]:
        bullets.append(f"edited `{f}`")
    for f in s["files_multi"]:
        bullets.append(f"multi-edited `{f}`")
    if bullets:
        for b in bullets[:25]:
            lines.append(f"- {b}")
        if len(bullets) > 25:
            lines.append(f"- _(+{len(bullets) - 25} more — see PROJECT_MEMORY.md for the consolidated picture)_")
    else:
        lines.append("- _(no file changes)_")
    lines.append("")

    # DB changes
    lines.append("## DB changes")
    db = s["by_tag"].get("db_migration", []) + s["by_tag"].get("db_access", [])
    if db:
        for d in db:
            lines.append(f"- `{d}`")
    else:
        lines.append("- _(none)_")
    lines.append("")

    # Tech stack changes
    lines.append("## Tech stack changes")
    deps = s["by_tag"].get("dependency", [])
    if deps:
        for d in deps:
            lines.append(f"- `{d}`")
    else:
        lines.append("- _(none)_")
    lines.append("")

    # Infra / deploy / remote / git
    lines.append("## Infra, deploy, remote access, git remote")
    infra_lines = []
    for tag in ("infra", "deployment", "remote_access", "git_remote"):
        for cmd in s["by_tag"].get(tag, []):
            infra_lines.append(f"- [{tag}] `{cmd}`")
    if infra_lines:
        lines.extend(infra_lines)
    else:
        lines.append("- _(none)_")
    lines.append("")

    # Failed commands — always surfaced regardless of tag
    lines.append("## Failed commands ⚠")
    failed = s.get("failed_commands", [])
    if failed:
        for cmd in failed:
            lines.append(f"- ⚠ `{cmd}`")
    else:
        lines.append("- _(none)_")
    lines.append("")

    # Secrets touched (names only — values live in vault/secrets.local.md)
    lines.append("## Secrets touched (names only)")
    if s["secrets"]:
        env = s["secrets"].get("env_var", [])
        dom = s["secrets"].get("domain", [])
        ips = s["secrets"].get("ip_address", [])
        ssh = s["secrets"].get("ssh_public_key", [])
        pk = s["secrets"].get("private_key", [])
        if env:
            lines.append(f"- env var names: {', '.join(f'`{n}`' for n in env)}")
        if dom:
            lines.append(f"- domains: {', '.join(f'`{n}`' for n in dom)}")
        if ips:
            lines.append(f"- IPs: {', '.join(f'`{n}`' for n in ips)}")
        if ssh:
            lines.append(f"- SSH public key references: {len(ssh)}")
        if pk:
            lines.append(f"- ⚠ private key blocks detected: {len(pk)} — verify these landed in `vault/secrets.local.md` only")
    else:
        lines.append("- _(none)_")
    lines.append("> Values stored in `.claude/memory/vault/secrets.local.md` (gitignored).")
    lines.append("")

    lines.append("")

    # Decisions & rationale — the most valuable section; Claude MUST fill this in
    lines.append("## Decisions & rationale")
    lines.append("_(Claude: fill in every meaningful decision made this session._")
    lines.append("_Format: **Decision** — why this choice was made, what was considered and rejected._")
    lines.append("_Examples: chose Redis over Postgres for session storage because X;_")
    lines.append("_decided against JWT because Y; picked Drizzle over Prisma because Z)_")
    lines.append("")
    lines.append("- _(fill in)_")
    lines.append("")

    # Open threads & next start
    lines.append("## Open threads")
    lines.append("- _(Claude: unfinished work, known bugs, blockers, TODOs left undone this session)_")
    lines.append("")
    lines.append("## Next session starting point")
    lines.append("- _(Claude: one or two sentences — exactly where to pick up, what to do first)_")
    lines.append("")

    lines.append("---")
    lines.append("> Auto-summarized from the event stream. Edit freely — your edits are what the next session reads.")
    return "\n".join(lines)


def main():
    payload = read_hook_input()  # not used, but keeps stdin drained
    _ = payload

    state = load_state()
    sid = state.get("last_session_id")
    if not sid:
        return

    events = read_events()
    s = summarize_events(events)
    day = state["current_day"]
    sess_num = state["session_counter_today"]

    # Try to pull opened-at from first event, closed-at = now
    opened = events[0]["ts"] if events and "ts" in events[0] else "(unknown)"
    closed = datetime.now().isoformat()

    snap_path = memory_root() / "snapshots" / f"{sid}.md"
    snap_path.write_text(render_snapshot(sid, day, sess_num, s, opened, closed), encoding="utf-8")

    # Write / update the day rollup after every session
    _write_day_rollup(day)


def _write_day_rollup(day: int) -> None:
    """Combine all session snapshots for today into a single day{NNN}.md rollup.
    Rewritten every session so it always reflects the complete day.
    After day 3+ this is the primary way to answer "what did we do that day?"
    """
    snaps_dir = memory_root() / "snapshots"
    prefix = f"day{day:03d}_"
    today_snaps = sorted(
        [f for f in snaps_dir.glob(f"{prefix}session*.md")],
        key=lambda p: p.name,
    )
    if not today_snaps:
        return

    lines = [
        f"# Day {day} Rollup",
        f"- **Sessions today:** {len(today_snaps)}",
        f"- **Last updated:** {datetime.now().isoformat()}",
        "",
    ]

    # Aggregate goals, decisions, changes, failed commands across all sessions
    all_goals, all_decisions, all_files, all_deps, all_db, all_infra, all_failed, all_threads = [], [], [], [], [], [], [], []

    import re
    for snap in today_snaps:
        text = snap.read_text(encoding="utf-8")
        session_name = snap.stem

        def extract_section(md: str, header: str) -> list[str]:
            sep = chr(10)  # newline — avoids literal newline in string
            pat = '^## ' + re.escape(header) + sep + '(.*?)(?=^## |\\Z)'
            m = re.search(pat, md, re.MULTILINE | re.DOTALL)
            if not m:
                return []
            def is_placeholder(s: str) -> bool:
                s = s.strip().lstrip("- ").strip()
                if not s or s == "---":
                    return True
                if s.startswith("_(") and s.endswith(")_"):
                    return True
                if s.startswith("_(") and ("Claude:" in s or "Format:" in s or "Examples:" in s):
                    return True
                return False
            return [l.lstrip("- ").strip() for l in m.group(1).strip().splitlines()
                    if l.strip() and not is_placeholder(l)]
        goals = extract_section(text, "Session goal")
        if goals:
            all_goals.append(f"**{session_name}:** {goals[0]}")

        for d in extract_section(text, "Decisions & rationale"):
            all_decisions.append(d)

        for f in extract_section(text, "What changed"):
            all_files.append(f)

        for d in extract_section(text, "DB changes"):
            all_db.append(d)

        for d in extract_section(text, "Tech stack changes"):
            all_deps.append(d)

        for i in extract_section(text, "Infra, deploy, remote access, git remote"):
            all_infra.append(i)

        for f in extract_section(text, "Failed commands ⚠"):
            all_failed.append(f)

        for t in extract_section(text, "Open threads"):
            all_threads.append(t)

    def render_section(title: str, items: list[str], empty: str = "_(none)_") -> list[str]:
        out = [f"## {title}"]
        seen = []
        for item in items:
            if item not in seen:
                seen.append(item)
                out.append(f"- {item}")
        if not seen:
            out.append(f"- {empty}")
        out.append("")
        return out

    lines += render_section("Sessions — goals", all_goals)
    lines += render_section("Decisions made today", all_decisions)
    lines += render_section("Files changed today", all_files)
    lines += render_section("DB changes today", all_db)
    lines += render_section("Tech stack changes today", all_deps)
    lines += render_section("Infra / deploy / remote today", all_infra)
    if all_failed:
        lines += render_section("Failed commands today ⚠", all_failed, "_(none — clean day)_")
    lines += render_section("Open threads at end of day", all_threads)

    lines += [
        "---",
        f"> Day rollup — aggregated from {len(today_snaps)} session snapshot(s). "
        "Edit freely. Session snapshots are the source of truth."
    ]

    rollup_path = snaps_dir / f"day{day:03d}.md"
    rollup_path.write_text(chr(10).join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
