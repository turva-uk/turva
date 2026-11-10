"""Root URL configuration."""

from django.contrib import admin
from django.urls import include, path

from app.config import views

urlpatterns = [
    path("", views.home, name="home"),
    path("healthz/", views.healthz, name="healthz"),
    # The JSON API the React interface talks to - ADR 0003. Namespaced by
    # version, so a future v2 is a second include() rather than a branch inside
    # every view.
    path("api/v1/", include(("app.api.urls", "api"), namespace="v1")),
    # Server-rendered screens. Interim: they stay until React covers the same
    # ground, so there is never a window with no working interface, and they go
    # when it does.
    path("accounts/", include("app.accounts.urls")),
    path("safety-files/", include("app.safetyfiles.urls")),
    path("admin/", admin.site.urls),
]
