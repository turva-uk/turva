"""Account URLs.

Login, logout and the four password reset steps are Django's own views with
Turva's templates. Writing them by hand would be reimplementing tested code,
and password reset in particular is easy to get subtly wrong.
"""

from django.contrib.auth import views as auth_views
from django.urls import path

from app.accounts import views
from app.accounts.forms import LoginForm

app_name = "accounts"

urlpatterns = [
    path("register/", views.register, name="register"),
    path(
        "login/",
        auth_views.LoginView.as_view(
            template_name="accounts/login.html",
            authentication_form=LoginForm,
            redirect_authenticated_user=True,
        ),
        name="login",
    ),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    # Email verification.
    path("verify/notice/", views.verify_notice, name="verify_notice"),
    path("verify/resend/", views.verify_resend, name="verify_resend"),
    path("verify/<uuid:user_id>/<str:token>/", views.verify, name="verify"),
    # Password reset, four steps, all Django's.
    path(
        "password-reset/",
        auth_views.PasswordResetView.as_view(
            template_name="accounts/password_reset.html",
            email_template_name="accounts/email/password_reset.txt",
            html_email_template_name="accounts/email/password_reset.html",
            subject_template_name="accounts/email/password_reset_subject.txt",
            success_url="/accounts/password-reset/sent/",
        ),
        name="password_reset",
    ),
    path(
        "password-reset/sent/",
        auth_views.PasswordResetDoneView.as_view(template_name="accounts/password_reset_sent.html"),
        name="password_reset_done",
    ),
    path(
        "password-reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(
            template_name="accounts/password_reset_confirm.html",
            success_url="/accounts/password-reset/complete/",
        ),
        name="password_reset_confirm",
    ),
    path(
        "password-reset/complete/",
        auth_views.PasswordResetCompleteView.as_view(
            template_name="accounts/password_reset_complete.html"
        ),
        name="password_reset_complete",
    ),
    path("", views.dashboard, name="dashboard"),
]
