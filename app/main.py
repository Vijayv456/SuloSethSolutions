"""FastAPI application entry point.

Run with::

    uvicorn app.main:app --reload

Public site is served at ``/`` and the admin portal at ``/admin``.
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from . import auth, config
from .routes import admin as admin_routes
from .routes import public as public_routes
from .templating import render

app = FastAPI(title="SuloSethuSolution", docs_url=None, redoc_url=None)

app.add_middleware(
    SessionMiddleware,
    secret_key=config.SECRET_KEY,
    session_cookie=config.SESSION_COOKIE,
    max_age=60 * 60 * 8,  # 8h admin sessions
)

"""
@app.on_event("startup")
def _startup() -> None:
    config.ensure_dirs()
    auth.ensure_default_admin()"""


@app.middleware("http")
async def revalidate_static(request: Request, call_next):
    """Ask browsers to revalidate static assets so edits show up immediately."""
    response = await call_next(request)
    if request.url.path.startswith("/static"):
        response.headers["Cache-Control"] = "no-cache, max-age=0, must-revalidate"
    return response


config.ensure_dirs()
#app.mount("/static", StaticFiles(directory=str(config.STATIC_DIR)), name="static")

app.include_router(public_routes.router)
app.include_router(admin_routes.router)


@app.exception_handler(404)
async def not_found(request: Request, exc):  # noqa: ANN001
    if request.url.path.startswith("/admin"):
        from fastapi.responses import RedirectResponse

        return RedirectResponse("/admin/dashboard", status_code=302)
    return render(request, "public/404.html", {"page_title": "Page not found"})
