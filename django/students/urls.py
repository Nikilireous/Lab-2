from django.urls import path

from .views import StudentDetailView, StudentListView


urlpatterns = [
    path("requests", StudentListView.as_view(), name="student-list"),
    path("requests/<str:isu_id>", StudentDetailView.as_view(), name="student-detail")
]
