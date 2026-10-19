from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import StudentSerializer, StudentFilterSerializer
from .services import StudentAlreadyExists, create_student, find_student, list_students, remove_student, update_student, filter_students


class StudentListView(APIView):
    http_method_names = [
        "get",
        "post",
        "query",
        "head",
        "options",
    ]

    def options(self, request, *args, **kwargs):
        """Обработка preflight-запроса от браузера."""
        response = Response(status=status.HTTP_200_OK)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, QUERY, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    def get(self, request):
        students = list_students(request)
        serializer = StudentSerializer(students, many=True, context={"request": request})

        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = StudentSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        response = Response(status=status.HTTP_201_CREATED)

        try:
            student = create_student(request, response, serializer.validated_data)
        except StudentAlreadyExists as error:
            return Response({"errors": {"isuId": [str(error)]}}, status=status.HTTP_409_CONFLICT)

        response.data = StudentSerializer(student, context={"request": request}).data

        return response

    def query(self, request):
        students = list_students(request)

        filter_serializer = StudentFilterSerializer(data=request.data)

        if not filter_serializer.is_valid():
            return Response({"errors": filter_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        students = filter_students(students, filter_serializer.validated_data)

        serializer = StudentSerializer(students, many=True, context={"request": request})

        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentDetailView(APIView):
    def get(self, request, isu_id):
        student = find_student(request, isu_id)

        if student is None:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentSerializer(student, context={"request": request})

        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, isu_id):
        student = find_student(request, isu_id)

        if student is None:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentSerializer(data=request.data, partial=True,
                                       context={"request": request, "is_update": True,})

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        response = Response(status=status.HTTP_200_OK)

        try:
            updated_student = update_student(request, response, isu_id, serializer.validated_data)
        except StudentAlreadyExists as error:
            return Response({"errors": {"isuId": [str(error)]}}, status=status.HTTP_409_CONFLICT)

        if updated_student is None:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        response.data = StudentSerializer(updated_student, context={"request": request}).data

        return response

    def delete(self, request, isu_id):
        response = Response(status=status.HTTP_204_NO_CONTENT)

        deleted = remove_student(request, response, isu_id)

        if not deleted:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        return response
