import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Filters, Student, StudentPage } from './models';

@Injectable({ providedIn: 'root' })
export class StudentsApi {
  private http = inject(HttpClient);
  list(
    filters: Filters,
    sort: string,
    order: string,
    page: number,
    size: number,
  ): Observable<StudentPage> {
    let params = new HttpParams()
      .set('sort', sort)
      .set('order', order)
      .set('page', page)
      .set('size', size);
    for (const [key, value] of Object.entries(filters))
      if (value !== undefined && value !== '') params = params.set(key, value);
    return this.http.get<Student[]>('/api/students/', { params, observe: 'response' }).pipe(
      map((response) => ({
        items: response.body ?? [],
        total: Number(response.headers.get('X-Total-Count') ?? 0),
      })),
    );
  }
  get(id: string): Observable<Student> {
    return this.http.get<Student>(`/api/students/${encodeURIComponent(id)}/`);
  }
  create(student: Student): Observable<Student> {
    return this.http.post<Student>('/api/students/', student);
  }
  update(id: string, student: Student): Observable<Student> {
    return this.http.put<Student>(`/api/students/${encodeURIComponent(id)}/`, student);
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/students/${encodeURIComponent(id)}/`);
  }
}
