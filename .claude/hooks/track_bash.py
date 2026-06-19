#!/usr/bin/env python3
"""
PostToolUse (Bash) — log ONLY notable commands to keep snapshots clean.

Navigation noise (ls, cat, pwd, echo, mkdir, cd, grep, find, cp, mv,
rm, touch, which, head, tail, wc, sort, curl for non-deploy, etc.) is
silently dropped. Only commands that are meaningful to the project
history get recorded.

Failed commands (exit_code != 0) are flagged with ⚠ — they are often
the most diagnostic events of a session.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _memory_lib import (
    read_hook_input, log_event, scan_for_secret_refs, note_secret_refs,
)

# Commands that match these patterns are NOTABLE and get logged
NOTABLE = [
    (re.compile(r"\b(npm|pnpm|yarn|bun)\s+(install|add|remove|uninstall|ci)\b"), "dependency"),
    (re.compile(r"\bpip\s+(install|uninstall)\b"), "dependency"),
    (re.compile(r"\b(cargo\s+add|cargo\s+remove|go\s+get|gem\s+install|composer\s+require)\b"), "dependency"),
    (re.compile(r"\b(prisma|drizzle|knex|alembic|sequelize|flyway|liquibase)\b.*\b(migrate|migration|push|generate|studio)\b", re.I), "db_migration"),
    (re.compile(r"\b(docker|docker-compose|docker\s+compose|kubectl|helm|podman)\b"), "infra"),
    (re.compile(r"\bssh\b|\bscp\b|\brsync\b"), "remote_access"),
    (re.compile(r"\bgit\s+(push|pull|remote|clone|merge|rebase|tag|release)\b"), "git_remote"),
    (re.compile(r"\b(vercel|netlify|fly|railway|render|heroku|wrangler|gcloud|aws\s+deploy|eb\s+deploy)\b", re.I), "deployment"),
    (re.compile(r"\b(psql|mysql|mongosh|mongo|redis-cli|sqlite3|pgdump|pg_restore)\b"), "db_access"),
    (re.compile(r"\b(pytest|jest|vitest|mocha|rspec|go\s+test|cargo\s+test|phpunit)\b"), "test_run"),
    (re.compile(r"\b(openssl|keygen|ssh-keygen|certbot|acme)\b"), "cert_key"),
    (re.compile(r"\b(terraform|pulumi|cdk|ansible|puppet|chef)\b"), "iac"),
    (re.compile(r"\b(crontab|systemctl|service|launchctl|pm2\s+start|pm2\s+restart)\b"), "process_mgmt"),
]

# Commands that start with these are pure navigation noise — always drop
NOISE_PREFIXES = (
    "ls", "ll", "la", "pwd", "cd ", "echo ", "cat ", "head ", "tail ",
    "wc ", "sort ", "grep ", "find ", "which ", "type ", "whereis ",
    "cp ", "mv ", "mkdir ", "touch ", "rm ", "chmod ", "chown ",
    "export ", "source ", "alias ", "history", "clear", "man ",
    "printf ", "date", "whoami", "uname", "df ", "du ", "top",
    "ps ", "kill ", "pkill ", "open ", "code ", "nano ", "vim ",
    "less ", "more ", "diff ", "patch ", "awk ", "sed ", "cut ",
    "tr ", "xargs ", "tee ", "read ",
)


def is_noise(cmd: str) -> bool:
    """Return True if this command is pure navigation with no project-history value."""
    stripped = cmd.strip()
    lower = stripped.lower()
    # Check noise prefixes
    for prefix in NOISE_PREFIXES:
        if lower.startswith(prefix):
            return True
    # Pure variable assignment
    if re.match(r'^[A-Z_]+=', stripped):
        return True
    return False


def classify(cmd: str) -> list[str]:
    return [tag for pat, tag in NOTABLE if pat.search(cmd)]


def main():
    payload = read_hook_input()
    tool_input = payload.get("tool_input", {}) or {}
    tool_response = payload.get("tool_response", {}) or {}

    cmd = tool_input.get("command", "")
    if not cmd:
        return

    # Drop pure navigation noise silently
    if is_noise(cmd):
        return

    tags = classify(cmd)

    # Determine success — Claude Code sends exit_code for Bash
    exit_code = tool_response.get("exit_code")
    if exit_code is not None:
        success = (int(exit_code) == 0)
    else:
        success = bool(tool_response.get("success", True))

    short = cmd if len(cmd) <= 200 else cmd[:200] + "…"

    log_event({
        "kind": "bash",
        "command": short,
        "tags": tags,
        "success": success,
        "failed": not success,
    })

    refs = scan_for_secret_refs(cmd)
    if refs:
        note_secret_refs(refs)


if __name__ == "__main__":
    main()
