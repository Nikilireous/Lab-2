import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings


@override_settings(ALLOWED_HOSTS=["testserver"])
class StudentAPITests(SimpleTestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)

        storage_file = Path(directory.name) / "students.json"
        storage_patch = patch("students.storage.STORAGE_FILE", storage_file)
        storage_patch.start()
        self.addCleanup(storage_patch.stop)

    def student(self, isu_id, name, group="M3301", dormitory=8, date="2025-09-01"):
        return {
            "fullName": name,
            "group": group,
            "isuId": isu_id,
            "dormitory": dormitory,
            "room": 510,
            "settlementDate": date,
            "isForeign": False,
            "notes": "",
        }

    def query(self, filters, **headers):
        return self.client.generic(
            "QUERY",
            "/api/requests",
            data=json.dumps(filters).encode("utf-8"),
            content_type="application/json",
            **headers,
        )

    def test_create_update_delete_and_errors(self):
        student = self.student("123456", "Иван Иванов")
        created = self.client.post("/api/requests", student, content_type="application/json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["isuId"], "123456")

        duplicate = self.client.post("/api/requests", student, content_type="application/json")
        self.assertEqual(duplicate.status_code, 409)
        self.assertIn("isuId", duplicate.json()["errors"])

        updated = self.client.patch(
            "/api/requests/123456", {"room": 511}, content_type="application/json"
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["room"], 511)

        immutable_id = self.client.patch(
            "/api/requests/123456", {"isuId": "654321"}, content_type="application/json"
        )
        self.assertEqual(immutable_id.status_code, 422)
        self.assertIn("isuId", immutable_id.json()["errors"])

        deleted = self.client.delete("/api/requests/123456")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get("/api/requests/123456").status_code, 404)

    def test_get_and_query_filter_stored_students(self):
        first = self.student("123456", "Иван Иванов")
        second = self.student("654321", "Анна Петрова", "M3402", 9, "2024-09-01")
        second["isForeign"] = True
        self.client.post("/api/requests", first, content_type="application/json")
        self.client.post("/api/requests", second, content_type="application/json")

        all_students = self.client.get("/api/requests")
        self.assertEqual(all_students.status_code, 200)
        self.assertEqual({item["isuId"] for item in all_students.json()}, {"123456", "654321"})

        foreign_group = self.client.get("/api/requests?group=M3402")
        self.assertEqual([item["isuId"] for item in foreign_group.json()], ["654321"])

        get_result = self.client.get("/api/requests?group=M3301&dormitory=8")
        self.assertEqual(get_result.status_code, 200)
        self.assertEqual([item["isuId"] for item in get_result.json()], ["123456"])

        search_result = self.client.get("/api/requests?search=пет")
        self.assertEqual([item["isuId"] for item in search_result.json()], ["654321"])

        query_result = self.query({"dateFrom": "2025-01-01", "dateTo": "2025-12-31"})
        self.assertEqual(query_result.status_code, 200)
        self.assertEqual([item["isuId"] for item in query_result.json()], ["123456"])

        invalid_range = self.query({"dateFrom": "2025-12-31", "dateTo": "2025-01-01"})
        self.assertEqual(invalid_range.status_code, 422)
        self.assertIn("dateTo", invalid_range.json()["errors"])

        malformed_json = self.client.generic(
            "QUERY", "/api/requests", data=b"{", content_type="application/json"
        )
        self.assertEqual(malformed_json.status_code, 400)
        self.assertIn("errors", malformed_json.json())

    def test_query_cors_preflight_allows_local_frontend(self):
        for origin in ("http://localhost:5500", "http://127.0.0.1:5500"):
            with self.subTest(origin=origin):
                preflight = self.client.options(
                    "/api/requests",
                    HTTP_ORIGIN=origin,
                    HTTP_ACCESS_CONTROL_REQUEST_METHOD="QUERY",
                    HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
                )
                self.assertEqual(preflight.status_code, 200)
                self.assertEqual(preflight["access-control-allow-origin"], origin)
                self.assertIn("QUERY", preflight["access-control-allow-methods"])
                self.assertIn("content-type", preflight["access-control-allow-headers"])

                response = self.query({}, HTTP_ORIGIN=origin)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response["access-control-allow-origin"], origin)

        blocked = self.client.options(
            "/api/requests",
            HTTP_ORIGIN="http://example.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="QUERY",
        )
        self.assertNotIn("access-control-allow-origin", blocked)
