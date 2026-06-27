"""Admin portal: auth, dashboard, submission management, CMS, settings, reports."""
from __future__ import annotations

import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse, Response, StreamingResponse

from .. import auth, config, store
from ..templating import render

router = APIRouter(prefix="/admin")


def _guard(request: Request):
    """Return the logged-in user, or a redirect response to the login page."""
    user = auth.current_user(request)
    if not user:
        return None
    return user


def _login_redirect():
    return RedirectResponse("/admin/login", status_code=302)


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------

@router.get("/")
def admin_root(request: Request):
    return RedirectResponse("/admin/dashboard", status_code=302)


@router.get("/login")
def login_page(request: Request):
    if auth.current_user(request):
        return RedirectResponse("/admin/dashboard", status_code=302)
    return render(request, "admin/login.html", {"page_title": "Sign in"})


@router.post("/login")
def login_submit(request: Request, username: str = Form(""), password: str = Form("")):
    user = auth.authenticate(username, password)
    if not user:
        return render(
            request, "admin/login.html",
            {"page_title": "Sign in", "error": "Invalid username or password.", "username": username},
        )
    auth.login_session(request, user)
    return RedirectResponse("/admin/dashboard", status_code=303)


@router.get("/logout")
def logout(request: Request):
    auth.logout_session(request)
    return RedirectResponse("/admin/login", status_code=302)


# --------------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------------

@router.get("/dashboard")
def dashboard(request: Request):
    if not (user := _guard(request)):
        return _login_redirect()
    counts = store.counts()
    pending = 0
    for key, meta in config.COLLECTIONS.items():
        first = meta["statuses"][0]
        pending += sum(1 for r in store.list_records(key) if r.get("status") == first)
    return render(
        request, "admin/dashboard.html",
        {
            "page_title": "Dashboard",
            "counts": counts,
            "pending": pending,
            "activity": store.recent_activity(10),
            "active": "dashboard",
        },
    )


# --------------------------------------------------------------------------
# Submission collections
# --------------------------------------------------------------------------

@router.get("/c/{key}")
def collection_list(request: Request, key: str, status: str = "", q: str = ""):
    if not (user := _guard(request)):
        return _login_redirect()
    if key not in config.COLLECTIONS:
        return RedirectResponse("/admin/dashboard", status_code=302)
    meta = config.COLLECTIONS[key]
    records = store.list_records(key)
    if status:
        records = [r for r in records if r.get("status") == status]
    if q:
        ql = q.lower()
        records = [r for r in records if ql in json.dumps(r, ensure_ascii=False).lower()]
    records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return render(
        request, "admin/collection_list.html",
        {
            "page_title": meta["label"],
            "key": key, "meta": meta, "records": records,
            "status": status, "q": q, "active": key,
        },
    )


@router.get("/c/{key}/{record_id}")
def collection_detail(request: Request, key: str, record_id: int):
    if not (user := _guard(request)):
        return _login_redirect()
    if key not in config.COLLECTIONS:
        return RedirectResponse("/admin/dashboard", status_code=302)
    rec = store.get_record(key, record_id)
    if not rec:
        return RedirectResponse(f"/admin/c/{key}", status_code=302)
    meta = config.COLLECTIONS[key]
    return render(
        request, "admin/collection_detail.html",
        {"page_title": meta["singular"], "key": key, "meta": meta, "rec": rec, "active": key},
    )


@router.post("/c/{key}/{record_id}/status")
def update_status(request: Request, key: str, record_id: int, status: str = Form("")):
    if not _guard(request):
        return _login_redirect()
    store.update_record(key, record_id, {"status": status})
    return RedirectResponse(f"/admin/c/{key}/{record_id}", status_code=303)


@router.post("/c/{key}/{record_id}/note")
def add_note(request: Request, key: str, record_id: int, note: str = Form("")):
    user = _guard(request)
    if not user:
        return _login_redirect()
    if note.strip():
        store.add_note(key, record_id, note.strip(), author=user.get("name", "admin"))
    return RedirectResponse(f"/admin/c/{key}/{record_id}", status_code=303)


@router.post("/c/{key}/{record_id}/delete")
def delete_record(request: Request, key: str, record_id: int):
    if not _guard(request):
        return _login_redirect()
    store.delete_record(key, record_id)
    return RedirectResponse(f"/admin/c/{key}", status_code=303)


# --------------------------------------------------------------------------
# Content management (CMS)
# --------------------------------------------------------------------------

@router.get("/content")
def content_index(request: Request):
    if not _guard(request):
        return _login_redirect()
    pages = [{"key": k, "file": v} for k, v in config.CONTENT_FILES.items()]
    return render(request, "admin/content_index.html",
                  {"page_title": "Website Content", "pages": pages, "active": "content"})


@router.get("/content/{key}")
def content_edit(request: Request, key: str, saved: str = ""):
    if not _guard(request):
        return _login_redirect()
    if key not in config.CONTENT_FILES:
        return RedirectResponse("/admin/content", status_code=302)
    raw = json.dumps(store.get_content(key), indent=2, ensure_ascii=False)
    return render(request, "admin/content_edit.html",
                  {"page_title": f"Edit · {key}", "key": key, "raw": raw,
                   "saved": saved, "active": "content"})


@router.post("/content/{key}")
def content_save(request: Request, key: str, payload: str = Form("")):
    if not _guard(request):
        return _login_redirect()
    if key not in config.CONTENT_FILES:
        return RedirectResponse("/admin/content", status_code=302)
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as e:
        return render(request, "admin/content_edit.html",
                      {"page_title": f"Edit · {key}", "key": key, "raw": payload,
                       "error": f"Invalid JSON: {e}", "active": "content"})
    store.save_content(key, data)
    return RedirectResponse(f"/admin/content/{key}?saved=1", status_code=303)


# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------

@router.get("/settings")
def settings_page(request: Request, saved: str = ""):
    if not _guard(request):
        return _login_redirect()
    return render(request, "admin/settings.html",
                  {"page_title": "Settings", "saved": saved, "active": "settings"})


@router.post("/settings")
def settings_save(
    request: Request,
    company_name: str = Form(""), address: str = Form(""), phone: str = Form(""),
    email: str = Form(""), website: str = Form(""), working_hours: str = Form(""),
    linkedin: str = Form(""), github: str = Form(""), facebook: str = Form(""),
    instagram: str = Form(""), youtube: str = Form(""),
    smtp_host: str = Form(""), smtp_port: str = Form(""), smtp_user: str = Form(""),
    smtp_password: str = Form(""), notify_email: str = Form(""),
):
    if not _guard(request):
        return _login_redirect()
    store.save_settings({
        "company": {"name": company_name, "address": address, "phone": phone,
                    "email": email, "website": website, "working_hours": working_hours},
        "social": {"linkedin": linkedin, "github": github, "facebook": facebook,
                   "instagram": instagram, "youtube": youtube},
        "smtp": {"host": smtp_host, "port": smtp_port, "user": smtp_user,
                 "password": smtp_password, "notify_email": notify_email},
    })
    return RedirectResponse("/admin/settings?saved=1", status_code=303)


# --------------------------------------------------------------------------
# Users / profile
# --------------------------------------------------------------------------

@router.get("/users")
def users_page(request: Request, saved: str = "", error: str = ""):
    if not _guard(request):
        return _login_redirect()
    return render(request, "admin/users.html",
                  {"page_title": "Users", "users": store.get_users(),
                   "saved": saved, "error": error, "active": "users"})


@router.post("/users/add")
def users_add(request: Request, username: str = Form(""), name: str = Form(""),
              email: str = Form(""), role: str = Form("Admin"), password: str = Form("")):
    if not _guard(request):
        return _login_redirect()
    if not username or not password:
        return RedirectResponse("/admin/users?error=Username+and+password+required", status_code=303)
    if store.find_user(username):
        return RedirectResponse("/admin/users?error=Username+already+exists", status_code=303)
    users = store.get_users()
    users.append({
        "username": username, "name": name or username, "email": email, "role": role,
        "password": auth.hash_password(password),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })
    store.save_users(users)
    return RedirectResponse("/admin/users?saved=1", status_code=303)


@router.post("/users/delete")
def users_delete(request: Request, username: str = Form("")):
    user = _guard(request)
    if not user:
        return _login_redirect()
    if username == user.get("username"):
        return RedirectResponse("/admin/users?error=You+cannot+delete+yourself", status_code=303)
    users = [u for u in store.get_users() if u.get("username") != username]
    store.save_users(users)
    return RedirectResponse("/admin/users?saved=1", status_code=303)


@router.post("/profile/password")
def change_password(request: Request, current: str = Form(""), new_password: str = Form("")):
    user = _guard(request)
    if not user:
        return _login_redirect()
    if not auth.verify_password(current, user.get("password", "")):
        return RedirectResponse("/admin/users?error=Current+password+incorrect", status_code=303)
    users = store.get_users()
    for u in users:
        if u.get("username") == user.get("username"):
            u["password"] = auth.hash_password(new_password)
    store.save_users(users)
    return RedirectResponse("/admin/users?saved=1", status_code=303)


# --------------------------------------------------------------------------
# Reports / export
# --------------------------------------------------------------------------

@router.get("/reports")
def reports_page(request: Request):
    if not _guard(request):
        return _login_redirect()
    return render(request, "admin/reports.html",
                  {"page_title": "Reports", "counts": store.counts(), "active": "reports"})


def _flatten(rec: dict) -> dict:
    out = {}
    for k, v in rec.items():
        if k == "notes":
            out[k] = " | ".join(n.get("text", "") for n in v) if isinstance(v, list) else ""
        elif isinstance(v, (list, dict)):
            out[k] = json.dumps(v, ensure_ascii=False)
        else:
            out[k] = v
    return out


@router.get("/reports/{key}.{fmt}")
def export(request: Request, key: str, fmt: str):
    if not _guard(request):
        return _login_redirect()
    if key not in config.COLLECTIONS:
        return RedirectResponse("/admin/reports", status_code=302)
    records = [_flatten(r) for r in store.list_records(key)]
    fname = f"{key}_{datetime.now().strftime('%Y%m%d')}"

    if fmt == "json":
        body = json.dumps(store.list_records(key), indent=2, ensure_ascii=False)
        return Response(body, media_type="application/json",
                        headers={"Content-Disposition": f'attachment; filename="{fname}.json"'})

    # union of all keys for stable columns
    cols: list[str] = []
    for r in records:
        for c in r:
            if c not in cols:
                cols.append(c)

    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)
        return Response(buf.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{fname}.csv"'})

    if fmt == "xlsx":
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = key[:31]
        ws.append(cols)
        for r in records:
            ws.append([r.get(c, "") for c in cols])
        bio = io.BytesIO()
        wb.save(bio)
        bio.seek(0)
        return StreamingResponse(
            bio,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{fname}.xlsx"'},
        )

    return RedirectResponse("/admin/reports", status_code=302)
