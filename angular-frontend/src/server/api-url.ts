export function apiUrl(): string {
  const url = process.env['API_URL'];
  if (!url) throw new Error('Укажите API_URL для подключения к Java API.');
  return url.replace(/\/+$/, '');
}
