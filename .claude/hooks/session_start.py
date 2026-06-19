#!/usr/bin/env python3
"""
SessionStart hook (v2).

On first run (Day 1, Session 1): scaffolds PROJECT_CONTEXT.md,
PROJECT_MEMORY.md, and the plaintext secrets file; injects an onboarding
instruction so Claude interviews the user for the missing facts.

Every session: injects the current memory, last session's summary, model
policy, end-of-session protocol, and a reminder to write summarized points
(not raw transcripts) at session end.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _memory_lib import (
    load_state, new_session_id, memory_root, ensure_dirs,
    project_context_path, project_memory_path, secrets_local_path,
    get_git_remote_url, get_git_branch, scan_project_structure,
    scan_dependency_files, scan_env_example, diff_project_memory,
    save_memory_snapshot,
)


PROJECT_CONTEXT_TEMPLATE = """# Project Context

> Filled in by Claude during Day 1 Session 1 via interview. Update whenever it changes.

## Identity
- **Project name:**
- **Repository (URL or path):**
- **Project owner:** _(name + contact)_
- **Built for:** _(client / company / personal / open-source community)_
- **Team members:** _(name — role — contact)_

## Hosting & Servers
- **Platform:** _(AWS / GCP / Azure / Vercel / Netlify / Fly / Railway / Render / DigitalOcean / Hetzner / self-hosted / other)_
- **Server type:** _(shared / dedicated / VPS / serverless / container)_
- **Server config:** _(CPU, RAM, disk, region)_
- **Environments:** _(dev / staging / prod — URLs and which servers serve which)_
- **CI/CD:** _(GitHub Actions / GitLab CI / CircleCI / none)_

## Domains
- **Production domain(s):**
- **Staging domain(s):**
- **DNS provider:**

## Data
- **Database type & host:**
- **Backups:** _(provider / cadence / retention)_
- **Object storage:** _(S3 / R2 / GCS / none)_

## Notes
_(anything else worth remembering: SLAs, compliance, scaling plans, on-call)_
"""


PROJECT_MEMORY_TEMPLATE = """# Project Memory

> Maintained by Claude. Update as decisions are made and code lands.

## Tech Stack
_(languages, frameworks, runtimes, package managers, key libraries)_

## Project Structure
_(top-level directories and what each contains)_

## Database Architecture
_(tables/collections, key fields, relationships, indexes, migrations)_

## Code Flow
_(entry points, request lifecycle, key modules, data flow between them)_

## Imports & Exports Map
_(which modules export what; which modules consume them — important cross-cutting deps)_

## Side Effects
_(operations that mutate the DB, write files, call external APIs, send emails, etc.)_

## External Services
_(third-party APIs, hosted services, infra dependencies)_
"""


SECRETS_LOCAL_TEMPLATE = """# Local Secrets — DO NOT COMMIT

⚠ **READ THIS BEFORE ADDING SECRETS:**

This file stores plaintext secrets for this project. It is in `.gitignore` and
will not be pushed to git. It is **not** protected against:
- cloud sync (iCloud, Dropbox, OneDrive, Google Drive)
- editor or IDE telemetry
- backup software
- screen sharing / pair programming
- anyone with filesystem access to this machine
- accidental `cat` in a terminal that's being recorded or shared

Treat this file the way you'd treat a `.env` — fine for solo dev convenience,
NOT a substitute for a real secret manager (1Password, Bitwarden, Vault,
AWS Secrets Manager, Doppler) in any shared or production context.

---

## .env values

```
# DATABASE_URL=
# STRIPE_SECRET_KEY=
# REDIS_URL=
```

## SSH

- **Host:**
- **User:**
- **Port:**
- **Key path:**
- **Key passphrase:**

```
# Paste private key contents here if you must
```

## Service credentials

| Service | Username | Password / Token | Notes |
|---|---|---|---|
|   |   |   |   |

## Other (API keys, recovery codes, etc.)

"""


GITIGNORE_RULES = """
# Claude memory hook — local secrets & event logs
.claude/memory/vault/secrets.local.md
.claude/memory/vault/*.key
.claude/memory/vault/*.pem
.claude/memory/sessions/.*.events.jsonl
"""


def ensure_scaffolding():
    base = memory_root()
    if not project_memory_path().exists():
        project_memory_path().write_text(PROJECT_MEMORY_TEMPLATE, encoding="utf-8")
    if not project_context_path().exists():
        # Auto-fill repo URL on first scaffolding from git remote
        template = PROJECT_CONTEXT_TEMPLATE
        repo = get_git_remote_url()
        if repo:
            template = template.replace(
                "- **Repository (URL or path):**",
                f"- **Repository (URL or path):** {repo}"
            )
        project_context_path().write_text(template, encoding="utf-8")
    if not secrets_local_path().exists():
        secrets_local_path().write_text(SECRETS_LOCAL_TEMPLATE, encoding="utf-8")

    gi = base.parent.parent / ".gitignore"
    if gi.exists():
        content = gi.read_text(encoding="utf-8")
        if ".claude/memory/vault/secrets.local.md" not in content:
            gi.write_text(content.rstrip() + "\n" + GITIGNORE_RULES, encoding="utf-8")
    else:
        gi.write_text(GITIGNORE_RULES.lstrip(), encoding="utf-8")


def looks_unfilled(text: str) -> bool:
    """Semantic check: is the project context actually filled in with meaningful content?

    Goes beyond placeholder counting — checks whether key identity fields
    have non-empty, non-vague values after their colons.
    """
    import re
    REQUIRED = [
        "Project name", "Repository", "Project owner",
        "Platform", "Server type",
    ]
    missing = []
    for field in REQUIRED:
        # Match "- **Field:** value" or "- **Field:**" (empty)
        m = re.search(rf"\*\*{re.escape(field)}[^:]*:\*\*\s*(.*)", text)
        if not m:
            missing.append(field)
            continue
        value = m.group(1).strip()
        # Treat empty, "_(placeholder)_", or "skip"/"tbd"/"todo" as unfilled
        if not value:
            missing.append(field)
        elif value.startswith("_(") and value.endswith(")_"):
            missing.append(field)
        elif value.lower() in {"tbd", "todo", "skip", "n/a", "na", "-", "?", "unknown"}:
            missing.append(field)
    return bool(missing)



def _summarize_dep_file(filename: str, content: str) -> str:
    """Extract just the dependency names from a manifest file — skip versions,
    scripts, config noise. Keeps the injected context lean."""
    import json as _json
    import re as _re

    if filename == "package.json":
        try:
            data = _json.loads(content)
            deps = list(data.get("dependencies", {}).keys())
            dev = list(data.get("devDependencies", {}).keys())
            name = data.get("name", "")
            version = data.get("version", "")
            parts = []
            if name:
                parts.append(f"`{name}` v{version}")
            if deps:
                parts.append(f"deps: {', '.join(deps[:20])}" + (" +" + str(len(deps)-20) + " more" if len(deps) > 20 else ""))
            if dev:
                parts.append(f"devDeps: {', '.join(dev[:10])}" + (" +" + str(len(dev)-10) + " more" if len(dev) > 10 else ""))
            return " | ".join(parts) if parts else "(empty)"
        except Exception:
            pass
    elif filename in ("requirements.txt", "Pipfile"):
        pkgs = [l.strip().split("==")[0].split(">=")[0].split("~=")[0]
                for l in content.splitlines()
                if l.strip() and not l.startswith("#") and not l.startswith("-")]
        return f"{len(pkgs)} packages: {', '.join(pkgs[:15])}" + (" +" + str(len(pkgs)-15) + " more" if len(pkgs) > 15 else "")
    elif filename == "pyproject.toml":
        pkgs = _re.findall(r'["\']([a-zA-Z0-9_-]+)["\']\s*=', content)
        return f"detected: {', '.join(pkgs[:15])}" if pkgs else "(see pyproject.toml)"
    elif filename == "Cargo.toml":
        pkgs = _re.findall(r'^([a-zA-Z0-9_-]+)\s*=', content, _re.MULTILINE)
        return f"crates: {', '.join(pkgs[:15])}" if pkgs else "(see Cargo.toml)"
    elif filename == "go.mod":
        lines = [l.strip() for l in content.splitlines() if l.strip().startswith("require") or (l.startswith("    ") and "/" in l)]
        return f"{len(lines)} modules" if lines else "(see go.mod)"
    # Fallback: first 200 chars
    return content[:200].replace("\n", " ")



def _check_stale_memory(total_sessions: int) -> str:
    """Return a warning string if PROJECT_MEMORY.md hasn't been updated recently.
    Compares file mtime against the session-start snapshot baseline."""
    import time
    pm = project_memory_path()
    prev = memory_root() / ".project_memory.previous.md"
    if not pm.exists():
        return ""
    # Compare current content with previous snapshot
    # If they're identical for 3+ sessions, flag it
    if not prev.exists():
        return ""
    try:
        current = pm.read_text(encoding="utf-8")
        previous = prev.read_text(encoding="utf-8")
        if current.strip() == previous.strip():
            # Count how many snapshots have been written since they diverged
            snaps = sorted((memory_root() / "snapshots").glob("day*.md"))
            # Rough heuristic: if there are 3+ snapshots and memory is unchanged
            if len(snaps) >= 3:
                mtime = pm.stat().st_mtime
                age_hours = (time.time() - mtime) / 3600
                if age_hours > 1:  # Only warn if it's been at least an hour
                    return (
                        f"\n## ⚠ STALE MEMORY WARNING\n"
                        f"PROJECT_MEMORY.md has not been updated since the previous session "
                        f"({len(snaps)} snapshots exist). Either nothing changed "
                        f"(update it to confirm) or Claude forgot to update it (fix it now).\n"
                        f"Check each section: Tech Stack, Project Structure, DB Architecture, "
                        f"Code Flow, Imports/Exports, Side Effects. Update any that are stale.\n"
                    )
    except Exception:
        pass
    return ""

def _extract_snapshot_tail(snapshot: str) -> str:
    """From the previous session snapshot, extract only the high-signal sections:
    Session goal, Open threads, Next session starting point, Decisions & rationale.
    Drops the bulk (file lists, bash commands) to save context."""
    import re as _re
    sections_to_keep = [
        "Session goal", "Open threads",
        "Next session starting point", "Decisions"
    ]
    # Split on ## headers
    chunks = _re.split(r'(^## .+$)', snapshot, flags=_re.MULTILINE)
    out = []
    # First element is the preamble (date, session ID etc) — keep it short
    if chunks:
        preamble_lines = [l for l in chunks[0].splitlines() if l.strip()][:4]
        out.append("\n".join(preamble_lines))
    i = 1
    while i < len(chunks) - 1:
        header = chunks[i]
        body = chunks[i + 1] if i + 1 < len(chunks) else ""
        if any(k.lower() in header.lower() for k in sections_to_keep):
            out.append(f"{header}\n{body.rstrip()}")
        i += 2
    return "\n\n".join(out) if out else snapshot[:800]


def build_context(session_id: str, day: int, sess_num: int, source: str,
                  is_first_session: bool) -> str:
    pm = project_memory_path().read_text(encoding="utf-8")
    pc = project_context_path().read_text(encoding="utf-8")

    last_summary = ""
    snapshots = sorted((memory_root() / "snapshots").glob("*.md"))
    if snapshots:
        last_summary = _extract_snapshot_tail(snapshots[-1].read_text(encoding="utf-8"))

    # Ground-truth introspection (replaces fuzzy recall with disk facts)
    structure = scan_project_structure()
    deps = scan_dependency_files()
    env_keys = scan_env_example()
    branch = get_git_branch()
    memory_diff = diff_project_memory()

    onboarding = ""
    if is_first_session or looks_unfilled(pc):
        onboarding = """
## ⚠ FIRST-SESSION ONBOARDING (do this now)

`PROJECT_CONTEXT.md` still has unfilled placeholders. Before writing any
code, ask the user (one question at a time, conversationally) to fill in:

1. **Project name** + what it's for (client / company / personal / OSS)
2. **Repository URL**
3. **Project owner** (name + contact) and **team members** (name, role, contact)
4. **Hosting platform** (AWS, Vercel, Fly, self-hosted, etc.)
5. **Server type** (shared / dedicated / VPS / serverless) + config (CPU/RAM/region)
6. **Environments** (dev/staging/prod URLs and which server runs which)
7. **Production & staging domains**
8. **Database type & host**

If the user has any **secrets right now** (database URL, API keys, SSH host
& key path, deploy credentials), write them into
`.claude/memory/vault/secrets.local.md` — that file is gitignored and will
not be pushed. **Never write secret values into PROJECT_CONTEXT.md or
PROJECT_MEMORY.md or session logs** — those are not gitignored.

Once filled, update `PROJECT_CONTEXT.md` and confirm with the user before
moving on.
""".strip()

    # Render ground-truth sections
    # Deps: summarize to key names only — full content is available on disk
    deps_block = ""
    if deps:
        parts = []
        for name, text in deps.items():
            summary = _summarize_dep_file(name, text)
            parts.append(f"**{name}:** {summary}")
        deps_block = "\n".join(parts)
    else:
        deps_block = "_(no dependency manifest files found at project root)_"

    env_block = ""
    if env_keys:
        env_block = "Env keys discovered from .env.example / .env.local (names only):\n" + \
                    "\n".join(f"- `{k}`" for k in env_keys)
    else:
        env_block = "_(no .env.example or .env.local found)_"

    diff_block = ""
    if memory_diff:
        diff_block = f"```diff\n{memory_diff}\n```"
    else:
        diff_block = "_(no changes to PROJECT_MEMORY.md since last session)_"

    branch_block = f"current git branch: `{branch}`" if branch else "_(not a git repo or no branch)_"

    state_inner = load_state()
    stale_warning = _check_stale_memory(state_inner.get("total_sessions", 0))

    state_for_label = load_state()
    is_existing = state_for_label.get("is_existing_project", False)
    age_note = state_for_label.get("project_age_note", "")
    dev_onboard = state_for_label.get("developer_onboard_date", "")

    if is_existing and day == 0:
        day_label = "Day 0 — Developer Onboarding"
        project_type_note = (
            f"\n> **Existing project** — {age_note}\n"
            f"> Day 0 = {dev_onboard} (the day this developer joined).\n"
            f"> Pre-Day-0 history is documented in PROJECT_MEMORY.md under \'Pre-onboarding history\'.\n"
            f"> Day 1 begins tomorrow — the developer\'s first full working day.\n"
        )
    elif is_existing:
        day_label = f"Day {day}"
        project_type_note = (
            f"\n> **Existing project** — {age_note} "
            f"| Developer joined: {dev_onboard}\n"
        )
    else:
        day_label = f"Day {day}"
        project_type_note = ""

    return f"""
# Claude Code Memory Hook — Active

Session: **{session_id}** ({day_label}, Session {sess_num}) — start trigger: `{source}`
{branch_block}
{project_type_note}
{stale_warning}
## Model Usage Policy
- **Default model: `claude-sonnet-4-6`** for reasoning, planning, design, code review, debugging.
- **Switch to `claude-haiku-4-5` ONLY** when you have a clear, mechanical set of
  instructions to execute (bulk edits, repetitive scaffolding, applying a
  pre-agreed plan). Use the `/model` command or announce the switch.
- **Switch back to `claude-sonnet-4-6`** as soon as the mechanical work is done.
- Rationale: save tokens on execution, keep quality high on thinking.

{onboarding}

## Project Context (people, servers, domains)
{pc}

## Ground-Truth Project Structure (from disk, not recall)
```
{structure}
```

## Ground-Truth Dependency Manifests (from disk)
{deps_block}

## Ground-Truth Environment Variables Expected
{env_block}

## Project Memory (architecture & code — what Claude has documented)
{pm}

## Changes to PROJECT_MEMORY.md since last session
{diff_block}

## Last Session Summary
{last_summary or "_No prior session._"}

## Living Document Rules — UPDATE AS YOU WORK, NOT JUST AT SESSION END

These are not end-of-session chores. Update the relevant file **the moment**
the thing changes — while the context is fresh, before you move on.

**`PROJECT_MEMORY.md` → Tech Stack:** update whenever a dependency is added,
removed, or upgraded; a new language/runtime/tool is introduced; or a framework
decision is made. Write: package name, version, why chosen, what it replaces.

**`PROJECT_MEMORY.md` → Project Structure:** update whenever a new directory
is created, a module is moved/renamed, or the top-level layout changes. Write:
directory name + one sentence on what lives there and why.

**`PROJECT_MEMORY.md` → Database Architecture:** update whenever a table or
collection is created, altered, or dropped; a migration runs; an index is added;
a relationship changes; or the DB host/engine changes. Write: table/collection
name, key fields, relationships, gotchas (nullable, unique, cascades).

**`PROJECT_MEMORY.md` → Code Flow:** update whenever a new entry point is added
(route, cron, webhook, queue consumer, CLI); the request lifecycle changes;
middleware is added/removed; or data moves through the system differently. Write:
entry point, what triggers it, what it calls, what it returns or writes.

**`PROJECT_MEMORY.md` → Imports & Exports Map:** update whenever a module starts
exporting something new, or another module starts depending on it. Write:
`moduleA` exports `X` → consumed by `moduleB`, `moduleC`.

**`PROJECT_MEMORY.md` → Side Effects:** update whenever code is written that
mutates the DB, writes to disk, sends email, calls an external API, enqueues a
job, or produces any observable effect outside its scope. Write: what triggers
it, what it does, what it affects downstream.

**`vault/secrets.local.md`:** write here immediately whenever any secret value
is revealed or created — .env variable values, DB connection strings, API keys,
service tokens, SSH host/user/port/key path/passphrase, server IPs, domain
credentials, recovery codes. This file is gitignored. **NEVER write secret
values into PROJECT_MEMORY.md, PROJECT_CONTEXT.md, or session logs** — those
are tracked by git.

**`PROJECT_CONTEXT.md`:** update whenever a team member joins or leaves;
hosting platform changes; a new environment is created or reconfigured;
server config changes (upgraded plan, new region); a domain is added; repo
URL changes; or project owner changes.

## End-of-Session Checklist (REQUIRED before closing)

Confirm before ending this session:
- [ ] PROJECT_MEMORY.md reflects all tech/DB/structure/flow/imports changes this session
- [ ] PROJECT_CONTEXT.md reflects any server/team/domain/env changes
- [ ] vault/secrets.local.md has all new secret values from this session
- [ ] Open threads and next starting point are written into the snapshot

The Stop hook auto-writes the session snapshot. But only the living docs above
carry forward to future sessions — if they are not updated, the next session
starts with stale context.

## Session log behavior
This session is being recorded as a structured **event stream** (not a verbatim
transcript). At session end, the hook compresses it into a short summary
covering: what changed, DB changes, tech stack changes, structure changes,
code flow changes, imports/exports affected, side effects, secrets touched
(names only — values go in secrets.local.md), open threads, next starting
point, and token usage.

## Paths
- Session summary (end of session): `.claude/memory/snapshots/{session_id}.md`
- Live event log (internal):        `.claude/memory/sessions/.{session_id}.events.jsonl`
""".strip()


def main():
    payload = {}
    try:
        raw = sys.stdin.read()
        if raw.strip():
            payload = json.loads(raw)
    except Exception:
        pass

    source = payload.get("source", "startup")
    ensure_dirs()

    first_run = not project_context_path().exists()
    ensure_scaffolding()

    state = load_state()
    is_first_session = state.get("total_sessions", 0) == 0

    if source == "resume" and state.get("last_session_id"):
        session_id = state["last_session_id"]
        day = state["current_day"]
        sess_num = state["session_counter_today"]
    else:
        session_id, day, sess_num = new_session_id(state)

    context = build_context(session_id, day, sess_num, source,
                            is_first_session or first_run)

    # Snapshot current PROJECT_MEMORY.md so next session can diff against it
    save_memory_snapshot()

    response = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": context,
        }
    }
    print(json.dumps(response))


if __name__ == "__main__":
    main()
