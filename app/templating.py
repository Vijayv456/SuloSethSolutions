"""Jinja2 setup + a ``render`` helper that injects global context.

Every template gets ``site`` (global config: company, nav, footer, social),
``settings`` and the logged-in ``user`` automatically, so individual routes
only pass page-specific data.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import Request
from fastapi.templating import Jinja2Templates

from . import auth, config, store

templates = Jinja2Templates(directory=str(config.TEMPLATES_DIR))


def _nl2br(value: str) -> str:
    from markupsafe import Markup, escape

    if value is None:
        return ""
    parts = [str(escape(p)) for p in str(value).split("\n")]
    return Markup("<br>".join(parts))


templates.env.filters["nl2br"] = _nl2br
templates.env.globals["now_year"] = datetime.now().year


def render(request: Request, template: str, context: dict | None = None):
    user = auth.current_user(request)
    ctx = {
        "request": request,
        "site": store.get_content("site"),
        "settings": store.get_settings(),
        "user": user,
        "collections": config.COLLECTIONS,
        "nav_counts": store.counts() if user else {},
    }
    if context:
        ctx.update(context)
    return templates.TemplateResponse(request, template, ctx)
