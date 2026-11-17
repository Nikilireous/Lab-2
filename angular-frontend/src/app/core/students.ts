import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, tap } from 'rxjs';
import { Filters, Student, StudentPage } from './models';
import { StudentChanges } from './student-changes';

@Injectable({ providedIn: 'root' })
export class StudentsApi {
  private http = inject(HttpClient);
  private changes = inject(StudentChanges);
  private destroy = inject(DestroyRef);
  private cache = new Map<string, { value: StudentPage; expires: number }>();

  constructor() {
    this.changes.changes$.pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.cache.clear());
  }
  list(
    filters: Filters,
    sort: string,
    order: string,
    page: number,
    size: number,
  ): Observable<StudentPage> {
    const options = { sort, order, page, size };
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
    );
    const key = JSON.stringify({ activeFilters, ...options });
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return of(cached.value);
    let params = new HttpParams()
      .set('sort', sort)
      .set('order', order)
      .set('page', page)
      .set('size', size);
    for (const [key, value] of Object.entries(activeFilters)) params = params.set(key, value);
    const response = Object.keys(activeFilters).length > 2
      ? this.http.request<Student[]>('QUERY', '/api/students/', {
          body: { ...activeFilters, ...options },
          observe: 'response',
        })
      : this.http.get<Student[]>('/api/students/', { params, observe: 'response' });
    return response.pipe(
      map((response) => ({
        items: response.body ?? [],
        total: Number(response.headers.get('X-Total-Count') ?? 0),
      })),
      tap((value) => {
        if (this.cache.size >= 3) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, { value, expires: Date.now() + 2500 });
      }),
    );
  }
  get(id: string): Observable<Student> {
    return this.http.get<Student>(`/api/students/${encodeURIComponent(id)}/`);
  }
  create(student: Student): Observable<Student> {
    return this.http.post<Student>('/api/students/', student).pipe(tap(() => {
      this.cache.clear();
      this.changes.announce();
    }));
  }
  update(id: string, student: Student): Observable<Student> {
    return this.http.put<Student>(`/api/students/${encodeURIComponent(id)}/`, student)
      .pipe(tap(() => { this.cache.clear(); this.changes.announce(); }));
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/students/${encodeURIComponent(id)}/`)
      .pipe(tap(() => { this.cache.clear(); this.changes.announce(); }));
  }
}
