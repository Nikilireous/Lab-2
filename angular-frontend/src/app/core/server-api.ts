import { HttpInterceptorFn } from '@angular/common/http';
import { injectRequest } from '@analogjs/router/tokens';

export const serverApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!import.meta.env.SSR || !request.url.startsWith('/api/')) return next(request);
  const incoming = injectRequest();
  const cookie: string = incoming?.headers.cookie || '';
  const csrf = cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))?.slice(11) || '';
  const backend = process.env['API_URL'] || 'http://127.0.0.1:8000';
  return next(request.clone({
    url: `${backend}${request.url}`,
    setHeaders: { Cookie: cookie, 'X-XSRF-TOKEN': decodeURIComponent(csrf) },
  }));
};
