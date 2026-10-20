from django.urls import path

from .views import StudentDetailView, StudentListView


urlpatterns = [
    path("students/", StudentListView.as_view(), name="student-list"),
    path("students/<str:isu_id>/", StudentDetailView.as_view(), name="student-detail"),
    # Старые адреса нужны вкладкам, открытым до перехода на /api/students/.
    path("requests", StudentListView.as_view()),
    path("requests/<str:isu_id>", StudentDetailView.as_view()),
]
