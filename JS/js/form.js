// ============================================
// form.js — логика формы добавления/редактирования студента
// Работает с Django REST API и validation.js
// ============================================

const API_BASE_URL = `http://${location.hostname || 'localhost'}:8000/api/students/`;

/**
 * Инициализация формы
 */
function initializeForm() {
  const form = document.getElementById("student-form");
  const formTitle = document.getElementById("form-title");
  const submitBtn = document.getElementById("submit-btn");
  const notesTextarea = document.getElementById("notes");
  const notesCounter = document.getElementById("notes-counter");

  const params = new URLSearchParams(location.search);
  const editId = params.get("id");

  if (editId) {
    formTitle.textContent = "Редактирование студента";
    submitBtn.textContent = "Сохранить изменения";
    loadStudentForEdit(editId);
  } else {
    formTitle.textContent = "Добавление студента";
    submitBtn.textContent = "Добавить студента";
  }

  // Счётчик символов для заметок
  notesTextarea.addEventListener("input", () => {
    const remaining = 500 - notesTextarea.value.length;
    notesCounter.textContent = remaining;
    notesCounter.classList.toggle("negative", remaining < 0);
  });

  // Очистка ошибок при вводе в поле
  form.addEventListener("input", (event) => {
    const field = event.target;
    if (field.name) {
      clearFieldError(field);
    }
  });

  // Обработка отправки формы
  form.addEventListener("submit", handleSubmit);
}

/**
 * Загрузить данные студента для редактирования
 */
async function loadStudentForEdit(id) {
  try {
    const response = await fetch(`${API_BASE_URL}${encodeURIComponent(id)}/`);
    if (!response.ok) {
      throw new Error("Студент не найден");
    }
    const student = await response.json();
    const form = document.getElementById("student-form");
    
    form.fullName.value = student.fullName || "";
    form.group.value = student.group || "";
    form.isuId.value = student.isuId || "";
    form.dormitory.value = student.dormitory || "";
    form.room.value = student.room || "";
    form.settlementDate.value = student.settlementDate || "";
    form.isForeign.checked = student.isForeign || false;
    form.notes.value = student.notes || "";

    const notesCounter = document.getElementById("notes-counter");
    notesCounter.textContent = 500 - (student.notes?.length || 0);

    // Блокируем изменение ИСУ ID при редактировании
    document.getElementById("isuId").readOnly = true;
    document.getElementById("isuId").classList.add("readonly-field");
  } catch (error) {
    showNotice(error.message, true);
    setTimeout(() => {
      location.href = "index.html";
    }, 1500);
  }
}

/**
 * Обработать отправку формы (с клиентской валидацией)
 */
async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const editId = new URLSearchParams(location.search).get("id");

  // 1. Собираем "сырые" данные из формы
  const rawData = {
    fullName: form.fullName.value,
    group: form.group.value,
    isuId: form.isuId.value,
    dormitory: form.dormitory.value,
    room: form.room.value,
    settlementDate: form.settlementDate.value,
    isForeign: form.isForeign.checked,
    notes: form.notes.value
  };

  // 2. Вызываем валидацию из validation.js
  const validation = validateStudent(rawData);

  // 3. Если есть ошибки, показываем их и прерываем отправку
  if (!validation.isValid) {
    showFormErrors(form, validation.errors);
    showNotice("Исправьте ошибки в форме", true);

    // Прокручиваем к первой ошибке для удобства
    const firstErrorField = form.querySelector(".input-error");
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      firstErrorField.focus();
    }
    return; // Останавливаем выполнение, на сервер не отправляем
  }

  // 4. Если всё ок, используем нормализованные данные для отправки на сервер
  const data = validation.normalized;
  if (editId) delete data.isuId;

  try {
    let response;
    if (editId) {
      // Обновление существующего студента
      response = await fetch(`${API_BASE_URL}${encodeURIComponent(editId)}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } else {
      // Создание нового студента
      response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(formatApiErrors(errorData) || `Ошибка сервера: ${response.status}`);
    }

    const status = editId ? "updated" : "created";
    location.href = `index.html?status=${status}`;
  } catch (error) {
    showNotice(error.message, true);
  }
}

/**
 * Форматировать ошибки от API (если сервер всё же что-то отклонил)
 */
function formatApiErrors(errorData) {
  if (errorData.errors) {
    const messages = Object.entries(errorData.errors)
      .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
      .join('; ');
    return messages;
  }
  return errorData.detail || null;
}

/**
 * Показать ошибки под конкретными полями формы
 */
function showFormErrors(form, errors) {
  clearAllFormErrors(form);
  
  for (const fieldName in errors) {
    const input = form.elements[fieldName];
    if (!input) continue;

    input.classList.add("input-error");

    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error";
    errorDiv.textContent = errors[fieldName];

    const hint = input.parentElement.querySelector(".form-hint");
    if (hint) {
      hint.insertAdjacentElement("afterend", errorDiv);
    } else {
      input.insertAdjacentElement("afterend", errorDiv);
    }
  }
}

/**
 * Очистить ошибку с конкретного поля при вводе
 */
function clearFieldError(field) {
  field.classList.remove("input-error");
  field.parentElement.querySelector(".field-error")?.remove();
}

/**
 * Очистить все ошибки из формы
 */
function clearAllFormErrors(form) {
  form.querySelectorAll(".field-error").forEach(el => el.remove());
  form.querySelectorAll(".input-error").forEach(el => {
    el.classList.remove("input-error");
  });
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
    }, 3000);
  }
}

// Запуск после загрузки DOM
document.addEventListener("DOMContentLoaded", initializeForm);
