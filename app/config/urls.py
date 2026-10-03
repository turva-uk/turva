"""Root URL configuration."""

from django.contrib import admin
from django.urls import include, path

from app.config import views

urlpatterns = [
    path("", views.home, name="home"),
    path("healthz/", views.healthz, name="healthz"),
    path("accounts/", include("app.accounts.urls")),
    path("admin/", admin.site.urls),
]
