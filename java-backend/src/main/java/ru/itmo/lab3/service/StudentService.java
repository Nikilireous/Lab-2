package ru.itmo.lab3.service;

import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;
import ru.itmo.lab3.api.ApiException;
import ru.itmo.lab3.dto.StudentDto;
import ru.itmo.lab3.dto.StudentFilter;
import ru.itmo.lab3.model.Student;
import ru.itmo.lab3.repository.StudentRepository;

@Stateless
public class StudentService {
    @Inject
    private StudentRepository repository;

    public Student find(String isuId) {
        Student student = repository.find(isuId);
        if (student == null) throw new ApiException(404, "detail", "Студент не найден.");
        return student;
    }

    public StudentRepository.SearchResult search(Map<String, String> values) {
        return repository.search(parseFilter(values));
    }

    public Student create(StudentDto input) {
        if (input == null) throw new ApiException(422, "detail", "Тело запроса обязательно.");
        if (input.isuId == null || !input.isuId.matches("[1-9]\\d{5}"))
            throw new ApiException(422, "isuId", "ИСУ ID должен состоять из 6 цифр.");
        if (repository.find(input.isuId) != null)
            throw new ApiException(409, "isuId", "Студент с таким ИСУ ID уже существует.");

        Student student = new Student();
        student.setIsuId(input.isuId);
        apply(student, input, true);
        repository.create(student);
        return student;
    }

    public Student update(String isuId, StudentDto input, boolean full) {
        if (input == null) throw new ApiException(422, "detail", "Тело запроса обязательно.");
        Student student = find(isuId);
        if (input.isuId != null && !input.isuId.equals(isuId))
            throw new ApiException(422, "isuId", "Нельзя изменить ИСУ ID студента.");
        apply(student, input, full);
        return student;
    }

    public void delete(String isuId) {
        repository.delete(find(isuId));
    }

    private void apply(Student student, StudentDto input, boolean full) {
        if (full && (input.fullName == null || input.group == null || input.dormitory == null
                || input.room == null || input.settlementDate == null || input.isForeign == null))
            throw new ApiException(422, "detail", "Для полного сохранения нужны все обязательные поля.");

        if (input.fullName != null) {
            String name = input.fullName.trim().replaceAll("\\s+", " ");
            if (!name.matches("[A-Za-zА-Яа-яЁё -]{2,120}"))
                throw new ApiException(422, "fullName", "ФИО: 2–120 букв, пробелы и дефисы.");
            student.setFullName(name);
        }
        if (input.group != null) {
            if (!input.group.matches("[A-Z][1-4][1-5]\\d{2}"))
                throw new ApiException(422, "group", "Неверный формат группы.");
            student.setGroup(input.group);
        }
        if (input.dormitory != null) {
            if (input.dormitory < 1 || input.dormitory > 20)
                throw new ApiException(422, "dormitory", "Общежитие должно быть от 1 до 20.");
            student.setDormitory(input.dormitory);
        }
        if (input.room != null) {
            if (input.room < 100 || input.room > 599)
                throw new ApiException(422, "room", "Комната должна быть от 100 до 599.");
            student.setRoom(input.room);
        }
        if (input.settlementDate != null) {
            LocalDate date = parseDate("settlementDate", input.settlementDate);
            if (date.isBefore(LocalDate.of(2010, 1, 1)) || date.isAfter(LocalDate.now().plusMonths(1)))
                throw new ApiException(422, "settlementDate", "Дата заселения вне допустимого периода.");
            student.setSettlementDate(date);
        }
        if (input.isForeign != null) student.setForeign(input.isForeign);
        if (input.notes != null || full) {
            String notes = input.notes == null ? "" : input.notes.trim();
            if (notes.length() > 500) throw new ApiException(422, "notes", "Максимум 500 символов.");
            student.setNotes(notes);
        }
    }

    public StudentFilter parseFilter(Map<String, String> values) {
        StudentFilter filter = new StudentFilter();
        String fullName = values.get("fullName");
        if (fullName != null && !fullName.matches("[A-Za-zА-Яа-яЁё -]{2,120}"))
            throw new ApiException(422, "fullName", "Неверное ФИО.");
        filter.fullName = fullName;
        String group = values.get("group");
        if (group != null && !group.matches("[A-Z][1-4][1-5]\\d{2}"))
            throw new ApiException(422, "group", "Неверный формат группы.");
        filter.group = group;
        String isuId = values.get("isuId");
        if (isuId != null && !isuId.matches("[1-9]\\d{5}"))
            throw new ApiException(422, "isuId", "Неверный ИСУ ID.");
        filter.isuId = isuId;
        filter.dormitory = number(values.get("dormitory"), "dormitory", 1, 20);
        filter.room = number(values.get("room"), "room", 100, 599);
        String foreign = values.get("isForeign");
        if (foreign != null) {
            if (!foreign.equals("true") && !foreign.equals("false"))
                throw new ApiException(422, "isForeign", "Используйте true или false.");
            filter.isForeign = Boolean.valueOf(foreign);
        }
        filter.settlementDate = optionalDate("settlementDate", values.get("settlementDate"));
        filter.dateFrom = optionalDate("dateFrom", values.get("dateFrom"));
        filter.dateTo = optionalDate("dateTo", values.get("dateTo"));
        if (filter.dateFrom != null && filter.dateTo != null && filter.dateFrom.isAfter(filter.dateTo))
            throw new ApiException(422, "dateTo", "Конец периода раньше начала.");
        filter.search = values.get("search");
        if (filter.search != null && filter.search.length() > 120)
            throw new ApiException(422, "search", "Максимум 120 символов.");

        String sort = values.getOrDefault("sort", "isuId");
        if (!Set.of("fullName", "group", "isuId", "dormitory", "room", "settlementDate", "isForeign").contains(sort))
            throw new ApiException(422, "sort", "Неизвестное поле сортировки.");
        filter.sort = sort;
        String order = values.getOrDefault("order", "asc");
        if (!order.equals("asc") && !order.equals("desc"))
            throw new ApiException(422, "order", "Используйте asc или desc.");
        filter.descending = order.equals("desc");

        filter.paginated = values.containsKey("page") || values.containsKey("size");
        if (filter.paginated) {
            filter.page = number(values.getOrDefault("page", "1"), "page", 1, 100000);
            filter.size = number(values.getOrDefault("size", "20"), "size", 1, 100);
        }
        return filter;
    }

    private static Integer number(String raw, String field, int min, int max) {
        if (raw == null) return null;
        try {
            int value = Integer.parseInt(raw);
            if (value >= min && value <= max) return value;
        } catch (NumberFormatException ignored) {
            // Возвращаем одинаковую ошибку для текста и числа вне диапазона.
        }
        throw new ApiException(422, field, "Допустимое значение: от " + min + " до " + max + ".");
    }

    private static LocalDate optionalDate(String field, String raw) {
        return raw == null ? null : parseDate(field, raw);
    }

    private static LocalDate parseDate(String field, String raw) {
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException error) {
            throw new ApiException(422, field, "Нужна дата в формате ГГГГ-ММ-ДД.");
        }
    }
}
