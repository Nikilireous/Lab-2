import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { AuthStore } from '../core/auth';
import { errorMessage } from '../core/errors';
import { Filters, Student } from '../core/models';
import { StudentsApi } from '../core/students';
import { StudentSearch } from '../core/student-search';
import { StudentChanges } from '../core/student-changes';
import { StudentFilters } from './student-filters';
import { StudentList } from './student-list';

@Component({
  selector: 'app-students',
  imports: [RouterLink, StudentFilters, StudentList],
  templateUrl: './students.html',
  styleUrl: './students.css',
})
export class StudentsPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(StudentsApi);
  private search = inject(StudentSearch);
  private destroy = inject(DestroyRef);
  private changes = inject(StudentChanges);
  readonly auth = inject(AuthStore);
  readonly form = this.fb.nonNullable.group({
    search: '',
    fullName: '',
    group: '',
    isuId: '',
    dormitory: '',
    room: '',
    isForeign: '',
    notes: '',
    settlementDate: '',
    dateFrom: '',
    dateTo: '',
  });
  readonly sort = signal('isuId');
  readonly order = signal('asc');
  readonly page = signal(1);
  readonly size = signal(10);
  readonly items = signal<Student[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly deleting = signal<string | null>(null);
  readonly pages = () => Math.max(1, Math.ceil(this.total() / this.size()));
  private reload$ = new BehaviorSubject(false);
  ngOnInit(): void {
    this.changes.changes$.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.reload(true));
    this.form.valueChanges
      .pipe(
        debounceTime(250),
        map((value) => JSON.stringify(value)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(() => {
        this.page.set(1);
        this.reload();
      });
    const queries = this.reload$.pipe(
      map((silent) => ({
        filters: this.form.getRawValue() as Filters,
        sort: this.sort(),
        order: this.order(),
        page: this.page(),
        size: this.size(),
        silent,
      })),
    );
    this.search
      .watch(queries)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((state) => {
        this.loading.set(state.loading);
        if ('data' in state) {
          this.error.set('');
          this.items.set(state.data.items);
          this.total.set(state.data.total);
          if (this.page() < Math.ceil(state.data.total / this.size())) {
            this.api.list(this.form.getRawValue() as Filters, this.sort(), this.order(),
              this.page() + 1, this.size()).pipe(takeUntilDestroyed(this.destroy))
              .subscribe({ error: () => {} });
          }
        }
        if ('error' in state) {
          this.error.set(state.error);
          this.items.set([]);
          this.total.set(0);
        }
      });
  }
  reload(silent = false): void {
    this.reload$.next(silent);
  }
  reset(): void {
    this.form.reset();
  }
  setSort(value: string): void {
    this.sort.set(value);
    this.page.set(1);
    this.reload();
  }
  toggleOrder(): void {
    this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    this.page.set(1);
    this.reload();
  }
  setSize(value: number): void {
    if (![10, 20, 50, 100].includes(value)) return;
    this.size.set(value);
    this.page.set(1);
    this.reload();
  }
  go(page: number): void {
    if (this.loading() || page < 1 || page > this.pages()) return;
    this.page.set(page);
    this.reload();
  }
  remove(student: Student): void {
    if (!this.auth.isAdmin() || this.deleting() || !confirm(`Удалить ${student.fullName}?`)) return;
    this.deleting.set(student.isuId);
    this.api
      .delete(student.isuId)
      .pipe(finalize(() => this.deleting.set(null)))
      .subscribe({
        next: () => {
          this.page.set(1);
          this.reload();
        },
        error: (err) => this.error.set(errorMessage(err)),
      });
  }
}
