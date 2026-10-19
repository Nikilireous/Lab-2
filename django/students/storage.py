"""
Модуль для хранения данных студентов в JSON-файле.
Потокобезопасный благодаря threading.Lock.
"""

import json
import os
import threading
from pathlib import Path

# Путь к файлу хранения (рядом с этим модулем)
STORAGE_FILE = Path(__file__).parent / "students.json"

# Блокировка для потокобезопасной записи
_lock = threading.Lock()


def _load_data() -> dict[str, dict]:
    """
    Загрузить всех студентов из JSON-файла.
    Возвращает словарь вида {isuId: student_dict}.
    """
    if not STORAGE_FILE.exists():
        return {}
    try:
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Если файл содержит список — конвертируем в словарь
            if isinstance(data, list):
                return {
                    str(s.get("isuId", "")): s
                    for s in data
                    if "isuId" in s
                }
            if isinstance(data, dict):
                return data
    except (json.JSONDecodeError, OSError) as e:
        print(f"Ошибка чтения {STORAGE_FILE}: {e}")
    return {}


def _save_data(data: dict[str, dict]) -> None:
    """Сохранить словарь студентов в JSON-файл."""
    STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def get_all_students() -> list[dict]:
    """Получить список всех студентов."""
    with _lock:
        data = _load_data()
    return list(data.values())


def get_student(isu_id: str) -> dict | None:
    """Найти студента по ИСУ ID."""
    isu_id = str(isu_id)
    with _lock:
        data = _load_data()
    return data.get(isu_id)


def save_student(student: dict) -> dict:
    """
    Сохранить или обновить студента.
    Возвращает сохранённого студента.
    """
    isu_id = str(student["isuId"])
    student = {**student, "isuId": isu_id}
    with _lock:
        data = _load_data()
        data[isu_id] = student
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
        if isu_id not in data:
            return False
        del data[isu_id]
        _save_data(data)
    return True