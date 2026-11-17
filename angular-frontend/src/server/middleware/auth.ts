import { appendResponseHeader, createError, defineEventHandler, getCookie, getRequestURL, sendRedirect, setHeader, setResponseStatus } from 'h3';

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  const known = ['/', '/login', '/register', '/profile', '/students', '/students/new'].includes(path)
    || /^\/students\/[^/]+(?:\/edit)?\/?$/.test(path);
  if (event.node.req.headers.accept?.includes('text/html') && !known)
    setResponseStatus(event, 404);
  if (path !== '/profile' && path !== '/students' && !path.startsWith('/students/')) return;
  setHeader(event, 'Cache-Control', 'private, no-store');
  if (getCookie(event, 'lab4_access')) return;
  if (!getCookie(event, 'lab4_refresh')) {
    await sendRedirect(event, '/login', 302);
    return;
  }

  const backend = process.env['API_URL'] || 'http://127.0.0.1:8000';
  const originalCookie = event.node.req.headers.cookie || '';
  const csrf = getCookie(event, 'XSRF-TOKEN') || '';
  let refreshed: Response;
  try {
    refreshed = await fetch(`${backend}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: originalCookie, 'X-XSRF-TOKEN': csrf },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Сервер API недоступен' });
  }
  const issued = refreshed.headers.get('set-cookie');
  if (!refreshed.ok || !issued) {
    await sendRedirect(event, '/login', 302);
    return;
  }
  appendResponseHeader(event, 'Set-Cookie', issued);
  event.node.req.headers.cookie = `${originalCookie}; ${issued.split(';')[0]}`;
});
