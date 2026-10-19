import json
from urllib.parse import quote, unquote

from django.http import HttpRequest, HttpResponse


COOKIE_PREFIX = "student_"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365


def get_student_cookie_name(isu_id: str) -> str:
    return f"{COOKIE_PREFIX}{isu_id}"

def set_student_cookie(response: HttpResponse, student: dict) -> None:
    isu_id = str(student["isuId"])
    cookie_name = get_student_cookie_name(isu_id)

    json_value = json.dumps(
        student,
        ensure_ascii=False,
        separators=(",", ":")
    )

    response.set_cookie(
        key=cookie_name,
        value=quote(json_value, safe=""),
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=False,
        samesite="Lax",
        path="/"
    )


def get_student(request: HttpRequest, isu_id: str) -> dict | None:
    cookie_name = get_student_cookie_name(isu_id)
    raw_value = request.COOKIES.get(cookie_name)

    if not raw_value:
        return None

    try:
        decoded_value = unquote(raw_value)
        student = json.loads(decoded_value)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None

    if not isinstance(student, dict):
        return None

    if str(student.get("isuId", "")) != isu_id:
        return None

    return student


def get_all_students(request: HttpRequest) -> list[dict]:
    students = []

    for cookie_name, raw_value in request.COOKIES.items():
        if not cookie_name.startswith(COOKIE_PREFIX):
            continue

        isu_id = cookie_name[len(COOKIE_PREFIX):]

        try:
            decoded_value = unquote(raw_value)
            student = json.loads(decoded_value)
        except (json.JSONDecodeError, TypeError, ValueError):
            continue

        if not isinstance(student, dict):
            continue

        if str(student.get("isuId", "")) != isu_id:
            continue

        students.append(student)

    return students

def delete_student_cookie(response: HttpResponse, isu_id: str) -> None:
    response.delete_cookie(
        key=get_student_cookie_name(isu_id),
        path="/"
    )
