import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { errorMessage } from './errors';
import { Filters, StudentPage } from './models';
import { StudentsApi } from './students';

export interface SearchQuery {
  filters: Filters;
  sort: string;
  order: string;
  page: number;
  size: number;
}
export type SearchState =
  { loading: true } | { loading: false; data: StudentPage } | { loading: false; error: string };

@Injectable({ providedIn: 'root' })
export class StudentSearch {
  private api = inject(StudentsApi);

  watch(queries: Observable<SearchQuery>): Observable<SearchState> {
    return queries.pipe(
      switchMap((query) => {
        if (
          query.filters.dateFrom &&
          query.filters.dateTo &&
          query.filters.dateFrom > query.filters.dateTo
        ) {
          return of({
            loading: false,
            error: 'Конец периода не может быть раньше начала.',
          } as SearchState);
        }
        return this.api.list(query.filters, query.sort, query.order, query.page, query.size).pipe(
          map((data) => ({ loading: false, data }) as SearchState),
          startWith({ loading: true } as SearchState),
          catchError((error) => of({ loading: false, error: errorMessage(error) } as SearchState)),
        );
      }),
    );
  }
}
