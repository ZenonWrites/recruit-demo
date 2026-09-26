from django.urls import path
from . import views

urlpatterns = [
    path("auth/login", views.login),
    path("me", views.me),
    path("stats", views.stats),
    path("jobs", views.jobs),
    path("jobs/<int:job_id>/apply", views.apply),
    path("applications", views.applications),
    path("applications/<int:app_id>", views.update_application),
    path("applications/<int:app_id>/offer", views.offer_response),
]
