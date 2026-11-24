import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { debounceTime, EMPTY, filter, fromEvent, interval, map, merge } from 'rxjs';

const KEY = 'lab4-students-changed';

@Injectable({ providedIn: 'root' })
export class StudentChanges {
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly changes$ = this.browser ? merge(
    interval(3000),
    fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event) => event.key === KEY),
      map(() => undefined),
    ),
    fromEvent(window, 'focus').pipe(map(() => undefined)),
    fromEvent(document, 'visibilitychange').pipe(
      filter(() => !document.hidden),
      map(() => undefined),
    ),
  ).pipe(debounceTime(50)) : EMPTY;

  announce(): void {
    if (this.browser) localStorage.setItem(KEY, `${Date.now()}-${Math.random()}`);
  }
}
