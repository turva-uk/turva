"""Safety file URLs."""

from django.urls import path

from app.safetyfiles import views

app_name = "safetyfiles"

urlpatterns = [
    path("", views.safety_file_list, name="list"),
    path("new/", views.safety_file_create, name="create"),
    path("<slug:slug>/", views.safety_file_detail, name="detail"),
]
