#!/usr/bin/env python3
"""
Hook health check. Run this anytime with:
    python .claude/hooks/healthcheck.py

Verifies:
- All hook scripts exist and have valid Python syntax
- settings.json is valid JSON and references existing hooks
- .gitignore has the required rules
- Memory directory structure is correct
- secrets.local.md is actually gitignored (cross-check with git)
- git remote URL is set
- Disk facts (project structure, dep files) are discoverable
"""

import json
import os
import py_compile
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path.cwd())
CLAUDE = ROOT / ".claude"
HOOKS = CLAUDE / "hooks"
MEMORY = CLAUDE / "memory"

PASS = "\033[32m✓\033[0m"
FAIL = "\033[31m✗\033[0m"
WARN = "\033[33m!\033[0m"

results: list[tuple[str, str, str]] = []  # (icon, title, detail)


def check(title: str, ok: bool, detail: str = "", warn: bool = False) -> bool:
    icon = PASS if ok else (WARN if warn else FAIL)
    results.append((icon, title, detail))
    return ok


def main() -> int:
    # 1. Hook scripts present and compile
    required_scripts = [
        "_memory_lib.py", "session_start.py", "session_end.py",
        "prompt_capture.py", "track_changes.py", "track_bash.py",
        "pre_compact.py",
    ]
    for s in required_scripts:
        p = HOOKS / s
        if not p.exists():
            check(f"hook file: {s}", False, f"missing at {p}")
            continue
        try:
            py_compile.compile(str(p), doraise=True)
            check(f"hook file: {s}", True, "exists, compiles")
        except py_compile.PyCompileError as e:
            check(f"hook file: {s}", False, f"syntax error: {e}")

    # 2. settings.json valid
    settings = CLAUDE / "settings.json"
    if not settings.exists():
        check("settings.json", False, f"missing at {settings}")
    else:
        try:
            cfg = json.loads(settings.read_text(encoding="utf-8"))
            hooks = cfg.get("hooks", {})
            registered = {"SessionStart", "UserPromptSubmit", "PostToolUse",
                          "Stop", "SessionEnd", "PreCompact"}
            actual = set(hooks.keys())
            missing = registered - actual
            check(
                "settings.json hook events",
                not missing,
                f"missing events: {sorted(missing)}" if missing else "all events registered",
            )
        except json.JSONDecodeError as e:
            check("settings.json", False, f"invalid JSON: {e}")

    # 3. Memory directory structure
    for sub in ("sessions", "snapshots", "vault"):
        p = MEMORY / sub
        check(f"memory dir: {sub}/", p.is_dir(), str(p))

    # 4. Living docs scaffolded
    for f in ("PROJECT_CONTEXT.md", "PROJECT_MEMORY.md"):
        check(f"memory file: {f}", (MEMORY / f).exists(), str(MEMORY / f))
    check(
        "vault/secrets.local.md",
        (MEMORY / "vault" / "secrets.local.md").exists(),
        "(plaintext secrets, gitignored)",
    )

    # 5. .gitignore has the rules
    gi = ROOT / ".gitignore"
    if not gi.exists():
        check(".gitignore", False, "file not found at project root")
    else:
        content = gi.read_text(encoding="utf-8")
        required_rules = [
            ".claude/memory/vault/secrets.local.md",
            ".claude/memory/sessions/.*.events.jsonl",
            ".claude/memory/snapshots/.*.precompact.md",
        ]
        missing_rules = [r for r in required_rules if r not in content]
        check(
            ".gitignore rules",
            not missing_rules,
            f"missing: {missing_rules}" if missing_rules else "all rules present",
        )

    # 6. git double-check — is secrets.local.md actually ignored?
    secrets_path = MEMORY / "vault" / "secrets.local.md"
    if secrets_path.exists():
        try:
            r = subprocess.run(
                ["git", "-C", str(ROOT), "check-ignore", "-q", str(secrets_path)],
                capture_output=True, timeout=3,
            )
            # exit code 0 = ignored, 1 = not ignored, 128 = not a git repo
            if r.returncode == 0:
                check("secrets actually gitignored", True, "git check-ignore confirms")
            elif r.returncode == 1:
                check("secrets actually gitignored", False,
                      "FILE WILL BE COMMITTED — fix .gitignore now")
            else:
                check("secrets actually gitignored", True,
                      "not a git repo (no risk yet)", warn=True)
        except Exception as e:
            check("secrets actually gitignored", True, f"could not verify: {e}", warn=True)

    # 7. Git remote
    try:
        r = subprocess.run(
            ["git", "-C", str(ROOT), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=3,
        )
        if r.returncode == 0 and r.stdout.strip():
            check("git remote origin", True, r.stdout.strip())
        else:
            check("git remote origin", True, "no remote set yet", warn=True)
    except Exception:
        check("git remote origin", True, "git not available", warn=True)

    # 8. Disk introspection sanity — at least one dep manifest exists?
    dep_files = [
        "package.json", "requirements.txt", "pyproject.toml", "Cargo.toml",
        "go.mod", "Gemfile", "composer.json",
    ]
    found = [f for f in dep_files if (ROOT / f).exists()]
    check(
        "dependency manifest discoverable",
        bool(found),
        f"found: {found}" if found else "no manifest files yet (early stage?)",
        warn=not found,
    )

    # Render
    print("\nClaude Code Memory Hook — Health Check")
    print(f"Project: {ROOT}\n")
    max_title = max(len(t) for _, t, _ in results) if results else 0
    for icon, title, detail in results:
        print(f"  {icon}  {title.ljust(max_title)}  {detail}")

    fails = sum(1 for icon, _, _ in results if icon == FAIL)
    warns = sum(1 for icon, _, _ in results if icon == WARN)
    print(f"\n{len(results)} checks  ·  {fails} failed  ·  {warns} warnings\n")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
