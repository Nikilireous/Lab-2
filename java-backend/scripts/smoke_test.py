"""Проверка API на отдельной временной базе Docker."""

import http.cookiejar
import json
import os
import random
import urllib.error
import urllib.parse
import urllib.request

API = os.getenv("API_URL", "http://127.0.0.1:8000/api/")


class Client:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookies)
        )

    def cookie(self, name):
        return next((cookie.value for cookie in self.cookies if cookie.name == name), None)

    def expect(self, status, method, path, body=None, csrf=True, headers=None):
        request_headers = {"Content-Type": "application/json"}
        if csrf and method not in ("GET", "HEAD", "QUERY", "OPTIONS"):
            token = self.cookie("XSRF-TOKEN")
            if token:
                request_headers["X-XSRF-TOKEN"] = token
        request_headers.update(headers or {})
        request = urllib.request.Request(
            API + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers=request_headers,
            method=method,
        )
        try:
            response = self.opener.open(request)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        result = json.loads(raw) if raw and "application/json" in response.headers.get("Content-Type", "") else None
        assert response.status == status, (
            f"{method} {path}: ожидалось {status}, получено {response.status}: {result}"
        )
        print(f"{method:7} {path:48} {response.status}")
        return result, response.headers


def main():
    if os.getenv("LAB3_TEST_DATABASE") != "1":
        raise SystemExit("Smoke-тест запускается только на отдельной базе с LAB3_TEST_DATABASE=1.")

    admin = Client()
    admin_user, login_headers = admin.expect(200, "POST", "auth/login", {
        "username": os.environ["ADMIN_USERNAME"],
        "password": os.environ["ADMIN_PASSWORD"],
    })
    assert admin_user["role"] == "ADMIN"
    assert admin.cookie("lab4_access") and admin.cookie("lab4_refresh") and admin.cookie("XSRF-TOKEN")
    assert "accessToken" not in admin_user and "refreshToken" not in admin_user
    issued = login_headers.get_all("Set-Cookie")
    for name in ("lab4_access", "lab4_refresh"):
        cookie = next(value for value in issued if value.startswith(name + "="))
        assert "HttpOnly" in cookie and "SameSite=Lax" in cookie
    csrf_cookie = next(value for value in issued if value.startswith("XSRF-TOKEN="))
    assert "HttpOnly" not in csrf_cookie

    reader = Client()
    reader_data = {
        "username": f"reader_{random.randrange(100000, 999999)}",
        "email": f"reader_{random.randrange(100000, 999999)}@example.com",
        "password": "Reader12345",
    }
    reader_user, _ = reader.expect(201, "POST", "auth/register", reader_data)
    assert reader_user["role"] == "USER"
    reader.expect(409, "POST", "auth/register", reader_data)
    reader.expect(422, "POST", "auth/register", {**reader_data, "password": "short"})

    student_id = str(random.randrange(100000, 999999))
    student = {
        "fullName": "Иванов Иван Иванович", "group": "P3212", "isuId": student_id,
        "dormitory": 7, "room": 315, "settlementDate": "2025-09-01",
        "isForeign": False, "notes": "Тест",
    }
    reader.expect(403, "POST", "students/", student)
    admin.expect(403, "POST", "students/", student, csrf=False)
    admin.expect(201, "POST", "students/", student)
    extra_ids = []
    try:
        candidate = 100000
        while len(extra_ids) < 20:
            extra_id = str(candidate)
            candidate += 1
            if extra_id == student_id:
                continue
            admin.expect(201, "POST", "students/", {**student, "isuId": extra_id, "group": "P3213"})
            extra_ids.append(extra_id)
        first_page, page_headers = reader.expect(200, "GET", "students/")
        assert len(first_page) == 20
        assert int(page_headers["X-Page-Size"]) == 20
        assert int(page_headers["X-Total-Count"]) >= 21
        second_page, _ = reader.expect(200, "GET", "students/?page=2")
        assert second_page

        admin.expect(409, "POST", "students/", student)
        detail, _ = reader.expect(200, "GET", f"students/{student_id}/")
        assert detail["isuId"] == student_id
        listing, headers = reader.expect(200, "GET", "students/?group=P3212&sort=fullName&order=desc&page=1&size=5")
        assert any(item["isuId"] == student_id for item in listing)
        assert int(headers["X-Total-Count"]) >= 1
        for name_part in ("Иванов", "Иван", "Иванович", "иванов"):
            matches, _ = reader.expect(200, "GET", f"students/?group=P3212&fullName={urllib.parse.quote(name_part)}")
            assert any(item["isuId"] == student_id for item in matches)
        queried, _ = reader.expect(200, "QUERY", "students/", {
            "group": "P3212", "dormitory": 7, "isForeign": False,
        })
        assert any(item["isuId"] == student_id for item in queried)
        invalid_group = {"fullName": "Иванов", "isuId": student_id, "group": "кушен"}
        get_error, _ = reader.expect(422, "GET", f"students/?fullName={urllib.parse.quote('Иванов')}&isuId={student_id}&group={urllib.parse.quote('кушен')}")
        query_error, _ = reader.expect(422, "QUERY", "students/", invalid_group)
        assert "group" in get_error["errors"] and "group" in query_error["errors"]
        admin.expect(422, "PATCH", f"students/{student_id}/", {"room": 999})
        changed, _ = admin.expect(200, "PATCH", f"students/{student_id}/", {"notes": "Изменено"})
        assert changed["notes"] == "Изменено"
        student["notes"] = "Полное обновление"
        admin.expect(200, "PUT", f"students/{student_id}/", student)
        reader.expect(403, "DELETE", f"students/{student_id}/")
        reader.expect(422, "GET", "students/?room=abc")
        Client().expect(401, "GET", "students/")

        before = reader.cookie("lab4_access")
        result, refresh_headers = reader.expect(204, "POST", "auth/refresh")
        assert result is None and reader.cookie("lab4_access") != before
        assert len(refresh_headers.get_all("Set-Cookie")) == 1
        current, _ = reader.expect(200, "GET", "auth/me")
        assert current["role"] == "USER"
        reader.expect(204, "POST", "auth/logout")
        assert reader.cookie("lab4_access") is None and reader.cookie("lab4_refresh") is None
        reader.expect(401, "POST", "auth/refresh")
        _, cors = admin.expect(200, "OPTIONS", "students/", headers={
            "Origin": "http://127.0.0.1:5500",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-xsrf-token",
        })
        assert cors["Access-Control-Allow-Credentials"] == "true"
    finally:
        for extra_id in extra_ids:
            admin.expect(204, "DELETE", f"students/{extra_id}/")
        admin.expect(204, "DELETE", f"students/{student_id}/")
    admin.expect(404, "GET", f"students/{student_id}/")
    print("Все сценарии пройдены.")


if __name__ == "__main__":
    main()
