"""
Модуль для хранения данных студентов в JSON-файле.
Потокобезопасный благодаря threading.Lock.
"""

import json
import threading
from pathlib import Path

# Путь к файлу хранения (рядом с этим модулем)
STORAGE_FILE = Path(__file__).parent / "students.json"

# Блокировка для потокобезопасной записи
_lock = threading.Lock()


def _load_data() -> list[dict]:
    """
    Загрузить всех студентов из JSON-файла.
    Старый формат со словарём также читается без потери записей.
    """
    if not STORAGE_FILE.exists():
        return []
    with open(STORAGE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        # Поддержка старых файлов: одна запись или словарь по ИСУ ID.
        return [data] if "isuId" in data else list(data.values())
    raise ValueError("Неверный формат файла студентов")


def _save_data(data: list[dict]) -> None:
    """Сохранить студентов массивом JSON-объектов."""
    STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def get_all_students() -> list[dict]:
    """Получить список всех студентов."""
    with _lock:
        data = _load_data()
    return data


def get_student(isu_id: str) -> dict | None:
    """Найти студента по ИСУ ID."""
    isu_id = str(isu_id)
    with _lock:
        data = _load_data()
    return next((student for student in data if str(student["isuId"]) == isu_id), None)


def save_student(student: dict) -> dict:
    """
    Сохранить или обновить студента.
    Возвращает сохранённого студента.
    """
    isu_id = str(student["isuId"])
    student = {**student, "isuId": isu_id}
    with _lock:
        data = _load_data()
        for index, existing in enumerate(data):
            if str(existing["isuId"]) == isu_id:
                data[index] = student
                break
        else:
            data.append(student)
        _save_data(data)
    return student


def delete_student(isu_id: str) -> bool:
    """
    Удалить студента по ИСУ ID.
    Возвращает True, если студент был удалён.
    """
    isu_id = str(isu_id)
    with _lock:
        data = _load_data()
        for index, student in enumerate(data):
            if str(student["isuId"]) == isu_id:
                del data[index]
                _save_data(data)
                return True
    return False
