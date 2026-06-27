# SuloSethuSolution

A premium, fully-dynamic marketing website **and** an admin portal, built with
**FastAPI + Jinja2 + vanilla JS** and a **JSON-file database** (no SQL server).

Everything the site shows is rendered server-side from JSON, and every piece of
content is editable from the admin portal.

## Features

**Public website (6 pages)** — Home, About, Services, Internship, Training, Contact.
Glassmorphism UI, animated canvas backgrounds, 6 colour themes incl. light mode,
scroll reveals, counters, marquees, carousels, accordions, GSAP polish.

**Admin portal** (`/admin`) — dashboard, submission management (service requests,
internship applications, training enrollments, contact messages) with status
workflow + notes, website content CMS (edit any page's JSON), settings (company,
social, SMTP), user management, and CSV/Excel/JSON report export.

**Forms** post to FastAPI and persist to JSON. Internship applications support
resume upload.

## Run

```bash
pip install -r requirements.txt
python run.py            # or: uvicorn app.main:app --reload
```

* Website → http://127.0.0.1:8000/
* Admin   → http://127.0.0.1:8000/admin  (default login **admin / admin123**)

> Change the default password from **Admin → Users** after first sign-in, and set
> `SULO_SECRET_KEY` in the environment for production session signing.

## Layout

```
app/
├── main.py            FastAPI app + middleware + static/router wiring
├── config.py          paths + collection/content registry
├── store.py           JSON read/write CRUD (the "database")
├── auth.py            PBKDF2 password hashing + session auth
├── templating.py      Jinja env + global-context render() helper
├── routes/
│   ├── public.py      6 pages + form submission endpoints
│   └── admin.py       portal: auth, dashboard, CRUD, CMS, settings, reports
├── templates/         base + partials + public/ + admin/
├── static/            css (styles, themes, admin), js (main, canvas), uploads/
└── data/
    ├── content/       editable page content (site, home, about, …)
    ├── submissions/   visitor form data
    ├── users.json     admin users
    └── settings.json  company / social / smtp
```
