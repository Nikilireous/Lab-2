// ============================================
// profile.js — логика страницы досье студента
// Работает с REST API
// ============================================

const API_BASE_URL = `http://${location.hostname || 'localhost'}:8000/api/students/`;
let deleteTimerId = null;

/**
 * Инициализация страницы после загрузки DOM
 */
function initializeProfile() {
  try {
    const params = new URLSearchParams(location.search);
    const studentId = params.get("id");

    if (!studentId) {
      showNotFound("Не указан ID студента");
      return;
    }

    loadStudentProfile(studentId);
  } catch (error) {
    showNotice("Ошибка: " + error.message, true);
  }
}

/**
 * Загрузить данные студента с сервера
 * @param {string} isuId - ИСУ ID студента
 */
async function loadStudentProfile(isuId) {
  try {
    const response = await fetch(`${API_BASE_URL}${encodeURIComponent(isuId)}/`);

    if (!response.ok) {
      if (response.status === 404) {
        showNotFound("Студент не найден");
      } else {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      return;
    }

    const student = await response.json();
    renderProfile(student);
    setupActions(isuId);
  } catch (error) {
    showNotice("Ошибка загрузки: " + error.message, true);
    console.error(error);
  }
}

/**
 * Заполнить страницу данными студента
 * @param {Object} student
 */
function renderProfile(student) {
  // Показываем контент, скрываем "не найдено"
  document.getElementById("profile-content").hidden = false;
  document.getElementById("profile-not-found").hidden = true;

  // Аватар с инициалами
  document.getElementById("profile-avatar").textContent = getInitials(student.fullName);

  // Основная информация
  document.getElementById("profile-name").textContent = student.fullName;
  document.getElementById("profile-group").textContent = "Группа " + student.group;

  // Статус (иностранец/не иностранец)
  const statusEl = document.getElementById("profile-status");
  if (student.isForeign) {
    statusEl.textContent = "◎ Иностранный студент";
    statusEl.className = "profile-status foreign";
  } else {
    statusEl.textContent = " Студент РФ";
    statusEl.className = "profile-status local";
  }

  // Основная информация
  document.getElementById("profile-isu").textContent = student.isuId;
  document.getElementById("profile-group-value").textContent = student.group;
  document.getElementById("profile-dorm").textContent = "№" + student.dormitory;
  document.getElementById("profile-room").textContent = student.room;

  // Заселение
  document.getElementById("profile-date").textContent = formatDate(student.settlementDate);
  document.getElementById("profile-foreign").textContent = student.isForeign
    ? "Да, является иностранцем"
    : "Нет, гражданин РФ";

  // Заметки
  const notesSection = document.getElementById("notes-section");
  const notesContent = document.getElementById("profile-notes");
  if (student.notes && student.notes.trim()) {
    notesContent.textContent = student.notes;
    notesSection.hidden = false;
  } else {
    notesSection.hidden = true;
  }

  // Ссылка на редактирование
  const editUrl = "student-form.html?v=students-api-3&id=" + encodeURIComponent(student.isuId);
  document.getElementById("edit-btn").setAttribute("href", editUrl);
}

/**
 * Настроить обработчики кнопок действий
 * @param {string} studentId
 */
function setupActions(studentId) {
  // Кнопка удаления
  const deleteBtn = document.getElementById("delete-btn");
  deleteBtn.addEventListener("click", () => handleDelete(studentId));
}

/**
 * Обработать удаление студента
 * @param {string} studentId
 */
async function handleDelete(studentId) {
  const deleteBtn = document.getElementById("delete-btn");

  // Первое нажатие — подтверждение
  if (deleteBtn.dataset.confirm !== "yes") {
    deleteBtn.dataset.confirm = "yes";
    deleteBtn.textContent = "Вы уверены?";
    deleteBtn.classList.add("confirming");

    if (deleteTimerId) clearTimeout(deleteTimerId);
    deleteTimerId = setTimeout(() => resetDeleteButton(), 3000);
    return;
  }

  // Второе нажатие — удаление через API
  try {
    if (deleteTimerId) clearTimeout(deleteTimerId);
    deleteBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}${encodeURIComponent(studentId)}/`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Студент не найден");
      }
      throw new Error(`Ошибка удаления: ${response.status}`);
    }

    showNotice("Студент удалён");
    setTimeout(() => {
      location.href = "index.html?v=students-api-3";
    }, 1500);
  } catch (error) {
    showNotice("Ошибка удаления: " + error.message, true);
    resetDeleteButton();
    console.error(error);
  } finally {
    deleteBtn.disabled = false;
  }
}

/**
 * Сбросить кнопку удаления
 */
function resetDeleteButton() {
  const deleteBtn = document.getElementById("delete-btn");
  deleteBtn.dataset.confirm = "";
  deleteBtn.textContent = "⌫ Удалить";
  deleteBtn.classList.remove("confirming");
}

/**
 * Показать состояние "не найдено"
 * @param {string} message
 */
function showNotFound(message) {
  document.getElementById("profile-content").hidden = true;
  document.getElementById("profile-not-found").hidden = false;
  document.querySelector("#profile-not-found .empty-text").textContent = message;
  document.title = "Студент не найден";
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

// ============================================
// Вспомогательные функции
// ============================================

function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName.charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

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

// Запуск после загрузки DOM
document.addEventListener("DOMContentLoaded", initializeProfile);
