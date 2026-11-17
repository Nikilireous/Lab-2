import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RouteMeta } from '@analogjs/router';
import { injectResponse } from '@analogjs/router/tokens';

export const routeMeta: RouteMeta = {
  canActivate: [() => {
    const response = injectResponse();
    if (import.meta.env.SSR && response) response.statusCode = 404;
    return true;
  }],
};

@Component({ imports: [RouterLink], template: '<h1>Страница не найдена</h1><p>Проверьте адрес.</p><a routerLink="/students">К списку студентов</a>' })
export default class NotFoundPage {}
