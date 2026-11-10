import { Injectable } from '@angular/core';
import { debounceTime, filter, fromEvent, map, merge } from 'rxjs';

const KEY = 'lab4-students-changed';

@Injectable({ providedIn: 'root' })
export class StudentChanges {
  readonly changes$ = merge(
    fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event) => event.key === KEY),
      map(() => undefined),
    ),
    fromEvent(window, 'focus').pipe(map(() => undefined)),
    fromEvent(document, 'visibilitychange').pipe(
      filter(() => !document.hidden),
      map(() => undefined),
    ),
  ).pipe(debounceTime(50));

  announce(): void {
    localStorage.setItem(KEY, `${Date.now()}-${Math.random()}`);
  }
}
