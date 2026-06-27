"""JSON-file persistence layer — the project's only "database".

Two kinds of data:

* **Content** (``content/*.json``) — website copy edited through the admin CMS.
* **Collections** (``submissions/*.json``) — visitor form submissions, each a
  list of records ``{id, created_at, status, ...fields}``.

A module-level lock serialises writes so concurrent requests can't corrupt a
file. Files are written atomically (temp file + replace).
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config

_LOCK = threading.RLock()


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S")


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return default


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    tmp.replace(path)


# --------------------------------------------------------------------------
# Content (CMS)
# --------------------------------------------------------------------------

def content_path(key: str) -> Path:
    return config.CONTENT_DIR / config.CONTENT_FILES[key]


def get_content(key: str) -> dict:
    return _read_json(content_path(key), {})


def save_content(key: str, data: dict) -> None:
    with _LOCK:
        _write_json(content_path(key), data)


def all_content() -> dict:
    """Every content document keyed by page name — handy for templates."""
    return {key: get_content(key) for key in config.CONTENT_FILES}


# --------------------------------------------------------------------------
# Collections (submissions)
# --------------------------------------------------------------------------

def _collection_path(key: str) -> Path:
    return config.SUBMISSIONS_DIR / config.COLLECTIONS[key]["file"]


def list_records(key: str) -> list[dict]:
    return _read_json(_collection_path(key), [])


def get_record(key: str, record_id: int) -> dict | None:
    for rec in list_records(key):
        if rec.get("id") == record_id:
            return rec
    return None


def add_record(key: str, fields: dict) -> dict:
    """Append a submission, stamping id, created_at and default status."""
    with _LOCK:
        records = list_records(key)
        next_id = max((r.get("id", 0) for r in records), default=0) + 1
        statuses = config.COLLECTIONS[key]["statuses"]
        record = {
            "id": next_id,
            "created_at": _now(),
            "status": statuses[0],
            "notes": [],
            **fields,
        }
        records.append(record)
        _write_json(_collection_path(key), records)
        return record


def update_record(key: str, record_id: int, changes: dict) -> dict | None:
    with _LOCK:
        records = list_records(key)
        updated = None
        for rec in records:
            if rec.get("id") == record_id:
                rec.update(changes)
                rec["updated_at"] = _now()
                updated = rec
                break
        if updated is not None:
            _write_json(_collection_path(key), records)
        return updated


def add_note(key: str, record_id: int, text: str, author: str = "admin") -> dict | None:
    with _LOCK:
        records = list_records(key)
        updated = None
        for rec in records:
            if rec.get("id") == record_id:
                rec.setdefault("notes", []).append(
                    {"text": text, "author": author, "at": _now()}
                )
                updated = rec
                break
        if updated is not None:
            _write_json(_collection_path(key), records)
        return updated


def delete_record(key: str, record_id: int) -> bool:
    with _LOCK:
        records = list_records(key)
        new = [r for r in records if r.get("id") != record_id]
        if len(new) == len(records):
            return False
        _write_json(_collection_path(key), new)
        return True


def counts() -> dict[str, int]:
    return {key: len(list_records(key)) for key in config.COLLECTIONS}


def recent_activity(limit: int = 8) -> list[dict]:
    """Newest submissions across every collection, for the dashboard feed."""
    items: list[dict] = []
    for key, meta in config.COLLECTIONS.items():
        for rec in list_records(key):
            items.append(
                {
                    "collection": key,
                    "collection_label": meta["singular"],
                    "icon": meta["icon"],
                    "id": rec.get("id"),
                    "name": rec.get("name") or rec.get("full_name") or "—",
                    "created_at": rec.get("created_at", ""),
                    "status": rec.get("status", ""),
                }
            )
    items.sort(key=lambda r: r["created_at"], reverse=True)
    return items[:limit]


# --------------------------------------------------------------------------
# Users & settings
# --------------------------------------------------------------------------

def get_users() -> list[dict]:
    return _read_json(config.USERS_FILE, [])


def save_users(users: list[dict]) -> None:
    with _LOCK:
        _write_json(config.USERS_FILE, users)


def find_user(username: str) -> dict | None:
    for u in get_users():
        if u.get("username", "").lower() == username.lower():
            return u
    return None


def get_settings() -> dict:
    return _read_json(config.SETTINGS_FILE, {})


def save_settings(data: dict) -> None:
    with _LOCK:
        _write_json(config.SETTINGS_FILE, data)
