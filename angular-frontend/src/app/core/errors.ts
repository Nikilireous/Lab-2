import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Не удалось выполнить запрос.';
  if (error.status === 0) return 'Сервер недоступен. Проверьте подключение и попробуйте снова.';
  const fields = error.error?.errors;
  if (fields && typeof fields === 'object') {
    const messages = Object.values(fields).map(String).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  if (error.status === 401) return 'Сеанс закончился. Войдите снова.';
  if (error.status === 403) return 'Недостаточно прав для этого действия.';
  if (error.status === 404) return 'Запись не найдена.';
  if (error.status >= 500) return 'Ошибка сервера. Попробуйте позже.';
  return `Не удалось выполнить запрос (HTTP ${error.status}).`;
}
