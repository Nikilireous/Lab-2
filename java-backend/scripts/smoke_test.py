"""Проверка ключевых сценариев лабораторной №3 на запущенном сервере."""

import json
import os
import pathlib
import random
import urllib.error
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
for line in (ROOT / ".env").read_text().splitlines():
    if line and not line.startswith("#"):
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value)

API = os.getenv("API_URL", "http://127.0.0.1:8000/api/")


def request(method, path, body=None, token=None, headers=None):
    request_headers = {"Content-Type": "application/json"}
    if token:
        request_headers["Authorization"] = f"Bearer {token}"
    request_headers.update(headers or {})
    payload = json.dumps(body).encode() if body is not None else None
    operation = urllib.request.Request(
        API + path, data=payload, headers=request_headers, method=method
    )
    try:
        response = urllib.request.urlopen(operation)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read()
    if not raw:
        result = None
    elif "application/json" in response.headers.get("Content-Type", ""):
        result = json.loads(raw)
    else:
        result = raw.decode()
    return response.status, result, response.headers


def expect(status, method, path, body=None, token=None, headers=None):
    actual, result, response_headers = request(method, path, body, token, headers)
    assert actual == status, f"{method} {path}: ожидалось {status}, получено {actual}: {result}"
    print(f"{method:7} {path:52} {actual}")
    return result, response_headers


def main():
    admin, _ = expect(200, "POST", "auth/login", {
        "username": os.environ["ADMIN_USERNAME"],
        "password": os.environ["ADMIN_PASSWORD"],
    })
    admin_token = admin["accessToken"]
    reader, _ = expect(201, "POST", "auth/register", {
        "username": f"reader_{random.randrange(100000, 999999)}",
        "email": f"reader_{random.randrange(100000, 999999)}@example.com",
        "password": "Reader12345",
    })
    reader_token = reader["accessToken"]
    assert reader["user"]["role"] == "USER"

    student_id = str(random.randrange(100000, 999999))
    student = {
        "fullName": "Иванов Иван Иванович", "group": "P3212", "isuId": student_id,
        "dormitory": 7, "room": 315, "settlementDate": "2025-09-01",
        "isForeign": False, "notes": "Тест",
    }
    expect(403, "POST", "students/", student, reader_token)
    expect(201, "POST", "students/", student, admin_token)
    try:
        detail, _ = expect(200, "GET", f"students/{student_id}/", token=reader_token)
        assert detail["isuId"] == student_id
        listing, headers = expect(200, "GET", "students/?group=P3212&sort=fullName&order=desc&page=1&size=5", token=reader_token)
        assert any(item["isuId"] == student_id for item in listing)
        assert int(headers["X-Total-Count"]) >= 1
        queried, _ = expect(200, "QUERY", "students/", {
            "group": "P3212", "dormitory": 7, "isForeign": False,
        }, reader_token)
        assert any(item["isuId"] == student_id for item in queried)
        expect(422, "PATCH", f"students/{student_id}/", {
            "fullName": "Петров Пётр Петрович", "room": 999,
        }, admin_token)
        unchanged, _ = expect(200, "GET", f"students/{student_id}/", token=reader_token)
        assert unchanged["fullName"] == student["fullName"]
        changed, _ = expect(200, "PATCH", f"students/{student_id}/", {"notes": "Изменено"}, admin_token)
        assert changed["notes"] == "Изменено"
        student["notes"] = "Полное обновление"
        changed, _ = expect(200, "PUT", f"students/{student_id}/", student, admin_token)
        assert changed["notes"] == "Полное обновление"
        expect(403, "DELETE", f"students/{student_id}/", token=reader_token)
        expect(422, "GET", "students/?room=abc", token=reader_token)
        expect(401, "GET", "students/")
        refreshed, _ = expect(200, "POST", "auth/refresh", {"refreshToken": reader["refreshToken"]})
        assert refreshed["accessToken"]
        current, _ = expect(200, "GET", "auth/me", token=reader_token)
        assert current["role"] == "USER"
        _, cors = expect(200, "OPTIONS", "students/", headers={
            "Origin": "http://127.0.0.1:5500", "Access-Control-Request-Method": "QUERY",
            "Access-Control-Request-Headers": "authorization,content-type",
        })
        assert cors["Access-Control-Allow-Origin"] == "http://127.0.0.1:5500"
    finally:
        expect(204, "DELETE", f"students/{student_id}/", token=admin_token)
    expect(404, "GET", f"students/{student_id}/", token=reader_token)
    print("Все сценарии пройдены.")


if __name__ == "__main__":
    main()
