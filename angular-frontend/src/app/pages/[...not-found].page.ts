import type { RouteMeta } from '@analogjs/router';
import { injectResponse } from '@analogjs/router/tokens';

export const routeMeta: RouteMeta = {
  canActivate: [() => {
    const response = injectResponse();
    if (import.meta.env.SSR && response) response.statusCode = 404;
    return true;
  }],
};

export { NotFoundPage as default } from './not-found/not-found';
