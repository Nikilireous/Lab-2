package ru.itmo.lab3.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import ru.itmo.lab3.api.ApiException;
import ru.itmo.lab3.dto.StudentFilter;

class StudentServiceTest {
    private final StudentService service = new StudentService();

    @Test
    void parsesFiltersSortingAndPagination() {
        StudentFilter filter = service.parseFilter(Map.of(
            "group", "M3301", "isForeign", "false", "dateFrom", "2025-01-01",
            "sort", "fullName", "order", "desc", "page", "2", "size", "10"
        ));
        assertEquals("M3301", filter.group);
        assertFalse(filter.isForeign);
        assertEquals(LocalDate.of(2025, 1, 1), filter.dateFrom);
        assertEquals("fullName", filter.sort);
        assertEquals(2, filter.page);
        assertEquals(10, filter.size);
    }

    @Test
    void rejectsWrongDateRangeAndSort() {
        ApiException range = assertThrows(ApiException.class, () -> service.parseFilter(
            Map.of("dateFrom", "2025-12-31", "dateTo", "2025-01-01")));
        assertEquals(422, range.getStatus());
        assertEquals(422, assertThrows(ApiException.class, () -> service.parseFilter(
            Map.of("sort", "DROP TABLE students"))).getStatus());
    }
}
