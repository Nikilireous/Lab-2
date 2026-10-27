// ============================================
// app.js — UI-контроллер страницы списка студентов
// Работает с REST API (GET + QUERY)
// ============================================

const API_BASE_URL = `http://${location.hostname || 'localhost'}:8000/api/students/`;
let deleteTimerId = null;
let latestRequestId = 0;

/**
 * Инициализация страницы после загрузки DOM
 */
function initializePage() {
  try {
    applyFilters(); // Стартовая загрузка без фильтров — GET
    showStatus();

    // Метод запроса зависит от количества заполненных фильтров
    document.getElementById("apply-filters").addEventListener("click", applyFilters);

    // Сбросить фильтры
    document.getElementById("reset-filters").addEventListener("click", resetFilters);

    // Поиск в реальном времени с небольшой задержкой
    document.getElementById("search-input").addEventListener("input", debounce(applyFilters, 300));

    // Делегирование кликов по таблице
    document.getElementById("students-table-body").addEventListener("click", handleTableClick);
  } catch (error) {
    showNotice("Ошибка инициализации: " + error.message, true);
  }
}

/**
 * До двух заполненных фильтров — GET, от трёх — QUERY
 */
async function applyFilters() {
  const requestId = ++latestRequestId;
  try {
    // Пустые поля не влияют на выбор метода запроса.
    const filters = Object.fromEntries(
      Object.entries(getFilters()).filter(([, value]) => value !== undefined && value !== "")
    );
    const filterCount = Object.keys(filters).length;
    let url = API_BASE_URL;
    let options = { method: 'GET' };

    if (filterCount > 2) {
      options = {
        method: 'QUERY',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      };
    } else if (filterCount > 0) {
      url += '?' + new URLSearchParams(filters).toString();
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(formatApiErrors(errorData) || `Ошибка сервера: ${response.status}`);
    }

    const students = await response.json();
    if (requestId !== latestRequestId) return;
    const notice = document.getElementById('notice');
    if (notice.classList.contains('error')) notice.hidden = true;
    renderStudents(students);
    updateStats(students);
  } catch (error) {
    if (requestId !== latestRequestId) return;
    showNotice("Ошибка загрузки: " + error.message, true);
    console.error(error);
  }
}

/**
 * Получить значения всех фильтров
 */
function getFilters() {
  return {
    group: document.getElementById("filter-group").value.trim() || undefined,
    dormitory: document.getElementById("filter-dormitory").value || undefined,
    room: document.getElementById("filter-room").value || undefined,
    isForeign: document.getElementById("filter-isForeign").value || undefined,
    dateFrom: document.getElementById("filter-dateFrom").value || undefined,
    dateTo: document.getElementById("filter-dateTo").value || undefined,
    search: document.getElementById("search-input").value.trim() || undefined
  };
}

/**
 * Сбросить все фильтры и загрузить полный список
 */
function resetFilters() {
  document.getElementById("filter-group").value = "";
  document.getElementById("filter-dormitory").value = "";
  document.getElementById("filter-room").value = "";
  document.getElementById("filter-isForeign").value = "";
  document.getElementById("filter-dateFrom").value = "";
  document.getElementById("filter-dateTo").value = "";
  document.getElementById("search-input").value = "";
  applyFilters();
}

/**
 * Отрисовать таблицу студентов
 */
function renderStudents(students) {
  const tableBody = document.getElementById("students-table-body");
  const table = document.getElementById("students-table");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptyText = document.getElementById("empty-text");
  const resultsSummary = document.getElementById("results-summary");

  tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (const student of students) {
    fragment.appendChild(createStudentRow(student));
  }
  tableBody.appendChild(fragment);

  const hasFilters = Object.values(getFilters()).some(v => v !== undefined && v !== "");
  table.hidden = students.length === 0;
  emptyState.hidden = students.length !== 0;

  emptyTitle.textContent = hasFilters ? "Ничего не найдено" : "Список пуст";
  emptyText.textContent = hasFilters ? "Попробуйте изменить фильтры" : "Добавьте первого студента";

  resultsSummary.textContent = hasFilters
    ? `Найдено: ${students.length}`
    : `Записей: ${students.length}`;
}

/**
 * Создать строку таблицы для студента
 */
function createStudentRow(student) {
  const row = document.createElement("tr");
  row.dataset.id = student.isuId;

  const profileUrl = `student-profile.html?v=students-api-3&id=${encodeURIComponent(student.isuId)}`;
  const editUrl = `student-form.html?v=students-api-3&id=${encodeURIComponent(student.isuId)}`;

  row.innerHTML = `
    <td data-label="Студент">
      <div class="student-cell">
        <div class="avatar">${escapeHtml(getInitials(student.fullName))}</div>
        <div>
          <a href="${profileUrl}" class="student-name">${escapeHtml(student.fullName)}</a>
          <div class="student-foreign">
            ${student.isForeign ? "◎ Иностранный" : " Студент РФ"}
          </div>
        </div>
      </div>
    </td>
    <td class="student-group" data-label="Группа">${escapeHtml(student.group)}</td>
    <td class="student-isu" data-label="ИСУ ID">${escapeHtml(student.isuId)}</td>
    <td class="student-dorm" data-label="Общежитие">№${escapeHtml(student.dormitory)}</td>
    <td class="student-room" data-label="Комната">${escapeHtml(student.room)}</td>
    <td class="student-date" data-label="Срок заселения">${escapeHtml(formatDate(student.settlementDate))}</td>
    <td class="actions-cell" data-label="Действия">
      <a href="${profileUrl}" class="btn-icon" title="Просмотр">👁</a>
      <a href="${editUrl}" class="btn-icon" title="Редактировать">✎</a>
      <button class="btn-icon action-delete" title="Удалить">⌫</button>
    </td>
  `;

  return row;
}

/**
 * Обработать клик по таблице (удаление)
 */
function handleTableClick(event) {
  const button = event.target.closest("button.action-delete");
  if (!button) return;

  const row = button.closest("tr");
  const id = row?.dataset.id;
  if (!id) return;

  if (button.dataset.confirm !== "yes") {
    document.querySelectorAll("button.action-delete").forEach(resetDeleteButton);

    button.dataset.confirm = "yes";
    button.textContent = "Да?";
    button.classList.add("confirming");

    if (deleteTimerId) clearTimeout(deleteTimerId);
    deleteTimerId = setTimeout(() => resetDeleteButton(button), 3000);
    return;
  }

  deleteStudent(id, button);
}

/**
 * Удалить студента через API
 */
async function deleteStudent(isuId, button) {
  button.disabled = true;
  try {
    if (deleteTimerId) clearTimeout(deleteTimerId);

    const response = await fetch(`${API_BASE_URL}${encodeURIComponent(isuId)}/`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Ошибка удаления: ${response.status}`);
    }

    showNotice("Студент удалён");
    applyFilters();
  } catch (error) {
    showNotice("Ошибка удаления: " + error.message, true);
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

/**
 * Сбросить кнопку удаления
 */
function resetDeleteButton(button) {
  if (!(button instanceof HTMLButtonElement)) return;
  button.dataset.confirm = "";
  button.textContent = "⌫";
  button.classList.remove("confirming");
}

/**
 * Обновить статистику
 */
function updateStats(students) {
  document.getElementById("total-count").textContent = students.length;
  document.getElementById("foreign-count").textContent =
    students.filter(s => s.isForeign).length;
}

/**
 * Показать уведомление о статусе (после редиректа с формы)
 */
function showStatus() {
  const params = new URLSearchParams(location.search);
  const status = params.get("status");

  if (status === "created") {
    showNotice("Студент успешно добавлен");
  } else if (status === "updated") {
    showNotice("Данные студента обновлены");
  }

  if (status) {
    params.delete("status");
    const query = params.toString();
    history.replaceState({}, "", location.pathname + (query ? `?${query}` : ""));
  }
}

/**
 * Показать уведомление
 */
function showNotice(message, isError = false) {
  const notice = document.getElementById("notice");
  notice.textContent = message;
  notice.hidden = false;
  notice.classList.toggle("error", isError);

  if (!isError) {
    setTimeout(() => {
      notice.hidden = true;
    }, 4000);
  }
}

/**
 * Форматировать ошибки от API
 */
function formatApiErrors(errorData) {
  if (!errorData) return null;
  if (errorData.errors) {
    return Object.entries(errorData.errors)
      .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
      .join('; ');
  }
  return errorData.detail || null;
}

/**
 * Debounce для поиска
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Получить инициалы из ФИО
 */
function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName.charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Форматировать дату
 */
function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

/**
 * Экранировать HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

// Запуск после загрузки DOM
document.addEventListener("DOMContentLoaded", initializePage);
