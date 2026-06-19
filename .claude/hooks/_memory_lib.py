"""
Shared utilities for the Claude Code memory management hook (v2).

Adds:
- Token usage tracking per session
- Plaintext local secrets store (gitignored, with prominent warning)
- Project context: server, platform, team, owner, repo
"""

import json
import os
import re
from datetime import datetime, date
from pathlib import Path


# -------------------- Paths & state --------------------

def project_dir() -> Path:
    p = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    return Path(p)


def memory_root() -> Path:
    return project_dir() / ".claude" / "memory"


def ensure_dirs() -> None:
    base = memory_root()
    for sub in ("sessions", "snapshots", "vault"):
        (base / sub).mkdir(parents=True, exist_ok=True)


def state_file() -> Path:
    return memory_root() / "state.json"


def load_state() -> dict:
    ensure_dirs()
    f = state_file()
    if not f.exists():
        today = date.today().isoformat()
        state = {
            "project_start_date": today,
            "current_day": 0,
            "current_day_date": today,
            "session_counter_today": 0,
            "total_sessions": 0,
            "last_session_id": None,
            "is_existing_project": False,
            "developer_onboard_date": today,
            "project_age_note": "",
        }
        f.write_text(json.dumps(state, indent=2), encoding="utf-8")
        return state
    data = json.loads(f.read_text(encoding="utf-8"))
    data.setdefault("is_existing_project", False)
    data.setdefault("developer_onboard_date", data.get("project_start_date", ""))
    data.setdefault("project_age_note", "")
    # Existing projects start at Day 0, new projects at Day 1
    if data.get("is_existing_project") and data.get("current_day") == 1 and data.get("total_sessions") == 0:
        data["current_day"] = 0
    return data


def save_state(state: dict) -> None:
    state_file().write_text(json.dumps(state, indent=2), encoding="utf-8")


# -------------------- Day & session numbering --------------------

def compute_day_number(start_iso: str) -> int:
    start = date.fromisoformat(start_iso)
    return (date.today() - start).days + 1


def roll_day_if_needed(state: dict) -> dict:
    today_iso = date.today().isoformat()
    expected_day = compute_day_number(state["project_start_date"])
    if state.get("current_day_date") != today_iso:
        state["current_day"] = expected_day
        state["current_day_date"] = today_iso
        state["session_counter_today"] = 0
    return state


def new_session_id(state: dict) -> tuple[str, int, int]:
    state = roll_day_if_needed(state)
    state["session_counter_today"] += 1
    state["total_sessions"] += 1
    day = state["current_day"]
    sess = state["session_counter_today"]
    session_id = f"day{day:03d}_session{sess:02d}"
    state["last_session_id"] = session_id
    save_state(state)
    return session_id, day, sess


# -------------------- Session files --------------------

def current_session_path() -> Path | None:
    state = load_state()
    sid = state.get("last_session_id")
    if not sid:
        return None
    return memory_root() / "sessions" / f"{sid}.md"


def session_events_path() -> Path | None:
    """Internal newline-delimited event log used to build the summary at the end."""
    state = load_state()
    sid = state.get("last_session_id")
    if not sid:
        return None
    return memory_root() / "sessions" / f".{sid}.events.jsonl"


def log_event(event: dict) -> None:
    """Append a structured event to the internal session event log."""
    p = session_events_path()
    if not p:
        return
    event["ts"] = datetime.now().isoformat()
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def read_events() -> list[dict]:
    p = session_events_path()
    if not p or not p.exists():
        return []
    out = []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out


# -------------------- Hook I/O --------------------

def read_hook_input() -> dict:
    import sys
    try:
        data = sys.stdin.read()
        return json.loads(data) if data.strip() else {}
    except Exception:
        return {}


# -------------------- Secret detection (references for the timeline) --------------------

SECRET_PATTERNS = [
    (re.compile(r"\b([A-Z][A-Z0-9_]{2,})\s*=\s*([^\s#]+)"), "env_var"),
    (re.compile(r"\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+){1,})\b"), "env_var_ref"),
    (re.compile(r"-----BEGIN [A-Z ]+PRIVATE KEY-----"), "private_key"),
    (re.compile(r"\bssh-(rsa|ed25519|dss)\s+[A-Za-z0-9+/=]+"), "ssh_public_key"),
    (re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"), "ip_address"),
    (re.compile(r"\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com|net|org|io|dev|app|co|ai|xyz|cloud|sh|me)\b", re.I), "domain"),
]

_COMMON_NON_SECRETS = {
    "PATH", "HOME", "USER", "PWD", "SHELL", "TERM", "LANG", "NODE_ENV",
    "TRUE", "FALSE", "NULL", "NONE", "UTF_8", "UTF8",
    "HTTP_OK", "HTTP_GET", "HTTP_POST", "GET", "POST", "PUT", "DELETE",
    "TODO", "FIXME", "XXX", "NOTE", "WARN", "INFO", "DEBUG", "ERROR",
    "README", "LICENSE", "MIT", "BSD", "GPL", "APACHE",
    "CPU", "GPU", "RAM", "USB", "SSD", "HDD",
    "OK", "NOK", "API", "URL", "URI", "URN", "UUID",
    "JSON", "YAML", "TOML", "XML", "HTML", "CSS", "SQL",
    "AWS", "GCP", "DNS", "TCP", "UDP", "SSH", "FTP", "SSL", "TLS",
}


def scan_for_secret_refs(text: str) -> list[dict]:
    refs = []
    for pat, kind in SECRET_PATTERNS:
        for m in pat.finditer(text):
            if kind in ("env_var", "env_var_ref"):
                key = m.group(1)
                if key in _COMMON_NON_SECRETS:
                    continue
                if kind == "env_var_ref" and "_" not in key:
                    continue
                refs.append({"kind": "env_var", "name": key})
            elif kind == "private_key":
                refs.append({"kind": "private_key", "name": "PRIVATE_KEY_BLOCK"})
            elif kind == "ssh_public_key":
                refs.append({"kind": "ssh_public_key", "name": "ssh_public_key"})
            elif kind == "ip_address":
                ip = m.group(0)
                if ip.startswith(("0.", "255.")):
                    continue
                refs.append({"kind": "ip_address", "name": ip})
            elif kind == "domain":
                refs.append({"kind": "domain", "name": m.group(0).lower()})
    seen = set()
    unique = []
    for r in refs:
        key = (r["kind"], r["name"])
        if key not in seen:
            seen.add(key)
            unique.append(r)
    return unique


def note_secret_refs(refs: list[dict]) -> None:
    """Log secret refs into the session event stream so the snapshot can list them.
    We do NOT maintain a separate INDEX.json — values live in vault/secrets.local.md."""
    if not refs:
        return
    log_event({"kind": "secret_refs", "refs": refs})


# -------------------- Project context --------------------

def project_context_path() -> Path:
    return memory_root() / "PROJECT_CONTEXT.md"


def project_memory_path() -> Path:
    return memory_root() / "PROJECT_MEMORY.md"


def secrets_local_path() -> Path:
    return memory_root() / "vault" / "secrets.local.md"


# -------------------- Repo / structure / deps introspection --------------------

import subprocess


def get_git_remote_url() -> str:
    """Return the origin remote URL, or empty string if not a git repo / no remote."""
    try:
        result = subprocess.run(
            ["git", "-C", str(project_dir()), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=3,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return ""


def get_git_branch() -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(project_dir()), "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=3,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return ""


def scan_project_structure(max_depth: int = 3) -> str:
    """Return a tree of top-level directories (excluding noise like node_modules)."""
    ignored = {
        "node_modules", ".git", ".next", ".nuxt", "dist", "build", "out",
        "__pycache__", ".venv", "venv", ".pytest_cache", ".mypy_cache",
        ".idea", ".vscode", "target", ".cargo", ".gradle", ".claude",
        "coverage", ".turbo", ".cache", "tmp", "temp",
    }
    root = project_dir()
    lines = []
    def walk(p: Path, depth: int, prefix: str = ""):
        if depth > max_depth:
            return
        try:
            entries = sorted(
                [e for e in p.iterdir() if e.is_dir() and e.name not in ignored
                 and not e.name.startswith(".")],
                key=lambda x: x.name,
            )
        except PermissionError:
            return
        for i, e in enumerate(entries):
            is_last = (i == len(entries) - 1)
            connector = "└── " if is_last else "├── "
            lines.append(f"{prefix}{connector}{e.name}/")
            if depth < max_depth:
                extension = "    " if is_last else "│   "
                walk(e, depth + 1, prefix + extension)
    lines.append(f"{root.name}/")
    walk(root, 1)
    return "\n".join(lines)


def scan_dependency_files() -> dict:
    """Read common dep manifests and return {filename: content snippet}."""
    root = project_dir()
    targets = [
        "package.json", "requirements.txt", "pyproject.toml", "Pipfile",
        "Cargo.toml", "go.mod", "Gemfile", "composer.json", "pom.xml",
        "build.gradle", "build.gradle.kts", "deno.json", "bun.lockb",
    ]
    out = {}
    for name in targets:
        p = root / name
        if p.exists() and p.is_file():
            try:
                text = p.read_text(errors="replace")
                # Cap each file at 4 KB to keep context lean
                if len(text) > 4000:
                    text = text[:4000] + "\n... (truncated)"
                out[name] = text
            except Exception:
                pass
    return out


def scan_env_example() -> list[str]:
    """Read .env.example and .env.local — return list of env var KEY names (no values)."""
    root = project_dir()
    names = set()
    for candidate in (".env.example", ".env.local", ".env.sample", ".env.template"):
        p = root / candidate
        if not p.exists():
            continue
        try:
            for line in p.read_text(errors="replace").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key = line.split("=", 1)[0].strip()
                    if key and key.replace("_", "").isalnum():
                        names.add(key)
        except Exception:
            pass
    return sorted(names)


# -------------------- Memory file diff --------------------

def memory_snapshot_history_path() -> Path:
    """Where we keep a copy of PROJECT_MEMORY.md from the previous session end."""
    return memory_root() / ".project_memory.previous.md"


def diff_project_memory() -> str:
    """Diff current PROJECT_MEMORY.md against the saved previous version.
    Returns a short unified diff, or empty string if no diff / no previous."""
    current_p = project_memory_path()
    prev_p = memory_snapshot_history_path()
    if not current_p.exists() or not prev_p.exists():
        return ""
    try:
        import difflib
        current = current_p.read_text(encoding="utf-8").splitlines(keepends=True)
        previous = prev_p.read_text(encoding="utf-8").splitlines(keepends=True)
        diff = list(difflib.unified_diff(
            previous, current,
            fromfile="last_session", tofile="now",
            lineterm="", n=2,
        ))
        if not diff:
            return ""
        # Cap diff at 80 lines
        if len(diff) > 80:
            diff = diff[:80] + ["... (diff truncated)"]
        return "\n".join(diff)
    except Exception:
        return ""


def save_memory_snapshot() -> None:
    """Save current PROJECT_MEMORY.md as the 'previous' baseline for next session's diff."""
    current_p = project_memory_path()
    if current_p.exists():
        memory_snapshot_history_path().write_text(current_p.read_text(encoding="utf-8"), encoding="utf-8")
