import { HttpInterceptorFn } from '@angular/common/http';
import { injectRequest } from '@analogjs/router/tokens';
import { apiUrl } from '../../server/api-url';

export const serverApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!import.meta.env.SSR || !request.url.startsWith('/api/')) return next(request);
  const incoming = injectRequest();
  const cookie: string = incoming?.headers.cookie || '';
  const csrf = cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))?.slice(11) || '';
  return next(request.clone({
    url: `${apiUrl()}${request.url}`,
    setHeaders: { Cookie: cookie, 'X-XSRF-TOKEN': decodeURIComponent(csrf) },
  }));
};
