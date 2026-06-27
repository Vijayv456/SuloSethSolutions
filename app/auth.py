"""Session-based admin authentication.

Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes in ``users.json``.
On first run a default admin (admin / admin123) is seeded — change it from the
admin profile page.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timezone

from fastapi import Request

from . import store

_ITERATIONS = 120_000


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt, _hash = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters))
        return hmac.compare_digest(dk.hex(), _hash)
    except (ValueError, AttributeError):
        return False


def ensure_default_admin() -> None:
    if not store.get_users():
        store.save_users(
            [
                {
                    "username": "admin",
                    "name": "Administrator",
                    "email": "admin@sulosethu.com",
                    "role": "Super Admin",
                    "password": hash_password("admin123"),
                    "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                }
            ]
        )


def authenticate(username: str, password: str) -> dict | None:
    user = store.find_user(username)
    if user and verify_password(password, user.get("password", "")):
        return user
    return None


def current_user(request: Request) -> dict | None:
    username = request.session.get("user")
    if not username:
        return None
    return store.find_user(username)


def login_session(request: Request, user: dict) -> None:
    request.session["user"] = user["username"]


def logout_session(request: Request) -> None:
    request.session.clear()
