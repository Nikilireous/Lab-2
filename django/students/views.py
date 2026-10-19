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

    def get(self, request):
        filters = StudentFilterSerializer(data=request.query_params.dict())

        if not filters.is_valid():
            return Response({"errors": filters.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        students = filter_students(list_students(), filters.validated_data)
        serializer = StudentSerializer(students, many=True, context={"request": request})

        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = StudentSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        try:
            student = create_student(serializer.validated_data)
        except StudentAlreadyExists as error:
            return Response({"errors": {"isuId": [str(error)]}}, status=status.HTTP_409_CONFLICT)

        data = StudentSerializer(student, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)

    def query(self, request):
        filter_serializer = StudentFilterSerializer(data=request.data)

        if not filter_serializer.is_valid():
            return Response({"errors": filter_serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        students = filter_students(list_students(), filter_serializer.validated_data)

        serializer = StudentSerializer(students, many=True, context={"request": request})

        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentDetailView(APIView):
    def get(self, request, isu_id):
        student = find_student(isu_id)

        if student is None:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentSerializer(student, context={"request": request})

        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, isu_id):
        student = find_student(isu_id)

        if student is None:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentSerializer(data=request.data, partial=True,
                                       context={"request": request, "is_update": True,})

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        updated_student = update_student(isu_id, serializer.validated_data)

        if updated_student is None:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        data = StudentSerializer(updated_student, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)

    def delete(self, request, isu_id):
        deleted = remove_student(isu_id)

        if not deleted:
            return Response({"errors": {"detail": "Студент не найден."}}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)
