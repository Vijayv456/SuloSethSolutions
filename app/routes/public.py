"""Public website routes: the six pages + visitor form submissions.

All page copy is loaded from ``content/*.json`` and rendered server-side, so
the marketing site is fully editable through the admin CMS without code
changes.
"""
from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse

from .. import config, store
from ..templating import render

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# --------------------------------------------------------------------------
# Pages
# --------------------------------------------------------------------------

def _page(request: Request, key: str, template: str):
    data = store.get_content(key)
    return render(request, template, {"page": data, "page_key": key})


@router.get("/")
def home(request: Request):
    return _page(request, "home", "public/home.html")


@router.get("/about")
def about(request: Request):
    return _page(request, "about", "public/about.html")


@router.get("/services")
def services(request: Request):
    return _page(request, "services", "public/services.html")


@router.get("/internship")
def internship(request: Request):
    return _page(request, "internship", "public/internship.html")


@router.get("/training")
def training(request: Request):
    return _page(request, "training", "public/training.html")


@router.get("/contact")
def contact(request: Request):
    return _page(request, "contact", "public/contact.html")


# --------------------------------------------------------------------------
# Form submissions
# --------------------------------------------------------------------------

def _wants_json(request: Request) -> bool:
    return (
        "application/json" in request.headers.get("accept", "")
        or request.headers.get("x-requested-with", "").lower() == "fetch"
    )


def _respond(request: Request, ok: bool, message: str, back: str):
    if _wants_json(request):
        return JSONResponse({"ok": ok, "message": message}, status_code=200 if ok else 400)
    sep = "&" if "?" in back else "?"
    return RedirectResponse(f"{back}{sep}sent={'1' if ok else '0'}", status_code=303)


def _validate(name: str, email: str) -> str | None:
    if not name.strip():
        return "Please enter your name."
    if not EMAIL_RE.match(email.strip()):
        return "Please enter a valid email address."
    return None


@router.post("/submit/service")
def submit_service(
    request: Request,
    name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    company: str = Form(""),
    service: str = Form(""),
    budget: str = Form(""),
    message: str = Form(""),
):
    err = _validate(name, email)
    if err:
        return _respond(request, False, err, "/services")
    store.add_record(
        "service_requests",
        {"name": name, "email": email, "phone": phone, "company": company,
         "service": service, "budget": budget, "message": message},
    )
    return _respond(request, True, "Thanks! Your request is in — we'll reply within one business day.", "/services")


@router.post("/submit/contact")
def submit_contact(
    request: Request,
    name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    subject: str = Form(""),
    inquiry_type: str = Form(""),
    message: str = Form(""),
):
    err = _validate(name, email)
    if err:
        return _respond(request, False, err, "/contact")
    store.add_record(
        "contact_messages",
        {"name": name, "email": email, "phone": phone, "subject": subject,
         "inquiry_type": inquiry_type, "message": message},
    )
    return _respond(request, True, "Message sent! We'll get back to you shortly.", "/contact")


@router.post("/submit/training")
def submit_training(
    request: Request,
    name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    course: str = Form(""),
    experience_level: str = Form(""),
    mode: str = Form(""),
    message: str = Form(""),
):
    err = _validate(name, email)
    if err:
        return _respond(request, False, err, "/training")
    store.add_record(
        "training_enrollments",
        {"name": name, "email": email, "phone": phone, "course": course,
         "experience_level": experience_level, "mode": mode, "message": message},
    )
    return _respond(request, True, "Enrollment received! Our team will contact you with the next steps.", "/training")


def _save_resume(upload: UploadFile | None) -> str:
    if not upload or not upload.filename:
        return ""
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", upload.filename)
    from datetime import datetime

    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    dest = config.UPLOADS_DIR / f"{stamp}_{safe}"
    with dest.open("wb") as fh:
        fh.write(upload.file.read())
    return f"uploads/{dest.name}"


@router.post("/submit/internship")
async def submit_internship(
    request: Request,
    full_name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    college: str = Form(""),
    degree: str = Form(""),
    graduation_year: str = Form(""),
    program: str = Form(""),
    duration: str = Form(""),
    message: str = Form(""),
    resume: UploadFile | None = File(None),
):
    err = _validate(full_name, email)
    if err:
        return _respond(request, False, err, "/internship")
    resume_path = _save_resume(resume)
    store.add_record(
        "internship_applications",
        {"name": full_name, "email": email, "phone": phone, "college": college,
         "degree": degree, "graduation_year": graduation_year, "program": program,
         "duration": duration, "message": message, "resume": resume_path},
    )
    return _respond(request, True, "Application submitted! Check your email for confirmation.", "/internship")
