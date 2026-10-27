const PATTERNS = {
  fullName: /^[a-zA-Zа-яА-ЯёЁ\s-]{2,}$/,
  group: /^[A-Z][1-4][1-5]\d{2}$/,
  isuId: /^[1-9]\d{5}$/,
  dormitory: /^([1-9]|1[0-9]|20)$/,
  room: /^[1-5]\d{2}$/,
  settlementDate: /^(\d{4})-(\d{2})-(\d{2})$/,
  notes: /^[\s\S]{0,500}$/
};



function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value) {
  if (typeof value === "string" && value.trim() === "") {
    return Number.NaN;
  }

  return typeof value === "number" || typeof value === "string"
    ? Number(value)
    : Number.NaN;
}

function isValidDate(value) {
  const match = PATTERNS.settlementDate.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const lastDayNextMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 2, 0)).getUTCDate();
  const maxDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1,
    Math.min(today.getDate(), lastDayNextMonth)));

  return (
    year >= 2010 &&
    maxDate >= date &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateStudent(input) {
  const errors = {};
  const fullName = normalizeText(input.fullName).replace(/\s+/gu, " ");
  const group = normalizeText(input.group);
  const isuId = normalizeText(input.isuId);
  const dormitory = normalizeNumber(input.dormitory);
  const room = normalizeNumber(input.room);
  const settlementDate = normalizeText(input.settlementDate);
  const notes = normalizeText(input.notes);

  if (!fullName) {
    errors.fullName = "Введите ФИО";
  } else if (fullName.length > 120 || !PATTERNS.fullName.test(fullName)) {
    errors.fullName = "Введите фамилию и имя буквами";
  }

  if (!group) {
    errors.group = "Введите группу";
  } else if (!PATTERNS.group.test(group)) {
    errors.group = "Группа состоит из латинской буквы и четырёх правильных цифр";
  }

  if (!isuId) {
    errors.isuId = "Введите ИСУ";
  } else if (!PATTERNS.isuId.test(isuId)) {
    errors.isuId = "ИСУ ID должен состоять из 6 цифр";
  }

  if (!dormitory) {
    errors.dormitory = "Введите номер общежития";
  } else if (!PATTERNS.dormitory.test(dormitory)) {
    errors.dormitory = "Номер общежития должен быть от 1 до 20";
  }

  if (!room) {
    errors.room = "Введите номер комнаты";
  } else if (!PATTERNS.room.test(room)) {
    errors.room = "Номер комнаты должен быть от 100 до 599";
  }

  if (!settlementDate) {
    errors.settlementDate = "Введите существующую дату заселения";
  } else if (!isValidDate(settlementDate)) {
    errors.settlementDate = "Введите правильную дату заселения не раньше 2010 года и не позже следующего месяца";
  }

  if (notes.length > 500) {
    errors.notes = "Заметка не должна превышать 500 символов";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      fullName,
      group,
      isuId,
      dormitory,
      room,
      settlementDate,
      isForeign: input.isForeign === true,
      notes,
    },
  };
}
