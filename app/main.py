"""FastAPI application entry point.

Run with::

    uvicorn app.main:app --reload

Public site is served at "/" and the admin portal at "/admin".
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from . import auth, config
from .routes import admin as admin_routes
from .routes import public as public_routes
from .templating import render


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown."""

    # Create directories only when running locally.
    config.ensure_dirs()

    # Create default admin if it doesn't exist.
    auth.ensure_default_admin()

    yield

    # Shutdown code (if needed)
    pass


app = FastAPI(
    title="SuloSethuSolution",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=config.SECRET_KEY,
    session_cookie=config.SESSION_COOKIE,
    max_age=60 * 60 * 8,
)


@app.middleware("http")
async def revalidate_static(request: Request, call_next):
    """Disable browser cache for static files."""

    response = await call_next(request)

    if request.url.path.startswith("/static"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    return response


app.mount(
    "/static",
    StaticFiles(directory=str(config.STATIC_DIR)),
    name="static",
)

app.include_router(public_routes.router)
app.include_router(admin_routes.router)


@app.exception_handler(404)
async def not_found(request: Request, exc):
    if request.url.path.startswith("/admin"):
        return RedirectResponse("/admin/dashboard", status_code=302)

    return render(
        request,
        "public/404.html",
        {"page_title": "Page not found"},
    )