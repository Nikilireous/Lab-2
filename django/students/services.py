from datetime import date
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


def list_students() -> list[dict]:
    return get_all_students()


def find_student(isu_id: str) -> dict | None:
    return get_student(isu_id)


def create_student(data: dict) -> dict:
    student = _prepare_student(data)
    isu_id = student["isuId"]

    if get_student(isu_id) is not None:
        raise StudentAlreadyExists

    return save_student(student)


def update_student(isu_id: str, data: dict) -> dict | None:
    existing = get_student(isu_id)

    if existing is None:
        return None

    updated = existing.copy()
    updated.update(_prepare_student(data))

    updated["isuId"] = isu_id

    return save_student(updated)


def remove_student(isu_id: str) -> bool:
    return delete_student(isu_id)


def filter_students(students: list[dict], filters: dict) -> list[dict]:
    def matches(student: dict) -> bool:
        for field in ("fullName", "group", "isuId", "dormitory", "room", "isForeign"):
            if field in filters and student.get(field) != filters[field]:
                return False

        settlement_date = student.get("settlementDate", "")

        if "settlementDate" in filters and settlement_date != filters["settlementDate"].isoformat():
            return False
        if "dateFrom" in filters and settlement_date < filters["dateFrom"].isoformat():
            return False
        if "dateTo" in filters and settlement_date > filters["dateTo"].isoformat():
            return False

        search = filters.get("search", "").casefold()
        if search and search not in student.get("fullName", "").casefold() and search not in student.get("isuId", ""):
            return False

        return True

    return [student for student in students if matches(student)]
