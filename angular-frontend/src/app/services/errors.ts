import { HttpErrorResponse } from '@angular/common/http';

const fieldNames: Record<string, string> = {
  fullName: 'ФИО',
  group: 'Группа',
  isuId: 'ИСУ ID',
  dormitory: 'Общежитие',
  room: 'Комната',
  settlementDate: 'Дата заселения',
  isForeign: 'Статус студента',
  notes: 'Примечания',
  dateFrom: 'Начало периода',
  dateTo: 'Конец периода',
  search: 'Поиск',
  username: 'Имя пользователя',
  email: 'Электронная почта',
  password: 'Пароль',
  refreshToken: 'Токен обновления',
  sort: 'Сортировка',
  order: 'Порядок сортировки',
  page: 'Номер страницы',
  size: 'Размер страницы',
};

export function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Не удалось выполнить запрос.';
  if (error.status === 0) return 'Сервер недоступен. Проверьте подключение и попробуйте снова.';
  const fields = error.error?.errors;
  if (fields && typeof fields === 'object') {
    const messages = Object.entries(fields).map(([field, value]) => {
      const message = String(value);
      const name = fieldNames[field];
      return name && !message.toLowerCase().startsWith(name.toLowerCase())
        ? `${name}: ${message}`
        : message;
    }).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  if (error.status === 401) return 'Авторизация: сеанс закончился. Войдите снова.';
  if (error.status === 403) return 'Права доступа: недостаточно прав для этого действия.';
  if (error.status === 404) return 'Запрашиваемая запись не найдена.';
  if (error.status === 422) return 'Данные формы отклонены сервером. Проверьте заполненные поля.';
  if (error.status >= 500) return 'Ошибка сервера. Попробуйте позже.';
  return `Не удалось выполнить запрос (HTTP ${error.status}).`;
}
