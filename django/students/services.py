from datetime import date
from django.http import HttpRequest, HttpResponse
# from .cookies import set_student_cookie, get_student, get_all_students, delete_student_cookie
from .storage import get_all_students, get_student, save_student, delete_student



class StudentAlreadyExists(Exception):
    def __str__(self):
        return "Студент с таким ИСУ ID уже существует."


def _prepare_student(data: dict) -> dict:
    student = dict(data)

    settlement_date = student.get("settlementDate")
    if isinstance(settlement_date, date):
        student["settlementDate"] = settlement_date.isoformat()

    if "isuId" in student:
        student["isuId"] = str(student["isuId"])

    return student


def list_students(request: HttpRequest) -> list[dict]:
    return get_all_students()


def find_student(request: HttpRequest, isu_id: str) -> dict | None:
    return get_student(isu_id)


def create_student(request: HttpRequest, response: HttpResponse, data: dict) -> dict:
    student = _prepare_student(data)
    isu_id = student["isuId"]

    if get_student(isu_id) is not None:
        raise StudentAlreadyExists

    return save_student(student)


def update_student(request: HttpRequest, response: HttpResponse, isu_id: str, data: dict) -> dict | None:
    existing = get_student(request, isu_id)

    if existing is None:
        return None

    updated = existing.copy()
    updated.update(_prepare_student(data))

    updated["isuId"] = isu_id

    return save_student(updated)


def remove_student(request: HttpRequest, response: HttpResponse, isu_id: str) -> bool:
    if get_student(isu_id) is None:
        return False

    delete_student(isu_id)
    return True


def filter_students(students: list[dict], filters: dict) -> list[dict]:
    result = students

    filter_params = ["fullName", "group", "isuId", "dormitory", "room", "settlementDate", "isForeign"]

    for param in filter_params:

        to_filter = filters.get(param)
        if to_filter is not None:
            result = [student for student in result if student.get(param) == to_filter]

    return result
