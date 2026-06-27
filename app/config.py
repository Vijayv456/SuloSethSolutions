"""Central configuration: filesystem paths and collection registry.

Everything the site renders lives in JSON under ``app/data``. There is no
database — ``store.py`` reads and writes these files, and the templates render
purely from the loaded dictionaries.
"""
from __future__ import annotations

import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
CONTENT_DIR = DATA_DIR / "content"        # editable website content (CMS)
SUBMISSIONS_DIR = DATA_DIR / "submissions"  # visitor form submissions
STATIC_DIR = APP_DIR / "static"
TEMPLATES_DIR = APP_DIR / "templates"
UPLOADS_DIR = STATIC_DIR / "uploads"      # resumes etc.

# Session signing key. Override in production via env var.
SECRET_KEY = os.environ.get("SULO_SECRET_KEY", "sulo-sethu-dev-secret-change-me-2026")
SESSION_COOKIE = "sulo_session"

# ---- Content files (one per public page + global site config) ----
CONTENT_FILES = {
    "site": "site.json",
    "home": "home.json",
    "about": "about.json",
    "services": "services.json",
    "internship": "internship.json",
    "training": "training.json",
    "contact": "contact.json",
}

# ---- Submission collections (visitor forms) ----
# key -> (filename, human label, status workflow)
COLLECTIONS = {
    "service_requests": {
        "file": "service_requests.json",
        "label": "Service Requests",
        "singular": "Service Request",
        "statuses": ["New", "In Progress", "Quoted", "Closed"],
        "icon": "fa-solid fa-puzzle-piece",
    },
    "internship_applications": {
        "file": "internship_applications.json",
        "label": "Internship Applications",
        "singular": "Internship Application",
        "statuses": ["Applied", "Under Review", "Interview Scheduled", "Selected", "Started", "Completed", "Rejected"],
        "icon": "fa-solid fa-rocket",
    },
    "training_enrollments": {
        "file": "training_enrollments.json",
        "label": "Training Enrollments",
        "singular": "Training Enrollment",
        "statuses": ["New", "Contacted", "Enrolled", "Completed"],
        "icon": "fa-solid fa-graduation-cap",
    },
    "contact_messages": {
        "file": "contact_messages.json",
        "label": "Contact Messages",
        "singular": "Contact Message",
        "statuses": ["New", "Read", "Replied", "Archived"],
        "icon": "fa-solid fa-envelope",
    },
}

USERS_FILE = DATA_DIR / "users.json"
SETTINGS_FILE = DATA_DIR / "settings.json"


def ensure_dirs() -> None:
    for d in (DATA_DIR, CONTENT_DIR, SUBMISSIONS_DIR, UPLOADS_DIR):
        d.mkdir(parents=True, exist_ok=True)
