"""API routes, version 1.

Versioned from the first release rather than retrofitted. ADR 0002 was right
that a half-specified API is worse than none, and the cheapest moment to add a
version segment is before anything depends on its absence.

`NamespaceVersioning` means the version is this URL namespace, so `v2` would be
a second `include()` rather than a branch inside every view.
"""

from django.urls import path

from app.api import views

app_name = "v1"

urlpatterns = [
    # Session and authentication. `session/` also sets the CSRF cookie, so the
    # client calls it before its first unsafe request.
    path("auth/session/", views.SessionView.as_view(), name="session"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/register/", views.RegistrationView.as_view(), name="register"),
    path("auth/verify/", views.VerificationView.as_view(), name="verify"),
    path("auth/verify/resend/", views.VerificationResendView.as_view(), name="verify-resend"),
    path("auth/password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "auth/password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("profile/options/", views.ProfileOptionsView.as_view(), name="profile-options"),
    path("hazard-options/", views.HazardOptionsView.as_view(), name="hazard-options"),
    path("assessment-preview/", views.AssessmentPreviewView.as_view(), name="assessment-preview"),
    path("safety-files/", views.SafetyFileListView.as_view(), name="safety-file-list"),
    path(
        "safety-files/<slug:slug>/",
        views.SafetyFileDetailView.as_view(),
        name="safety-file-detail",
    ),
    path(
        "safety-files/<slug:slug>/hazards/",
        views.HazardListView.as_view(),
        name="hazard-list",
    ),
    path(
        "safety-files/<slug:slug>/hazards/<str:hazard_id>/",
        views.HazardDetailView.as_view(),
        name="hazard-detail",
    ),
]
