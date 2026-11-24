import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, merge, of, switchMap } from 'rxjs';
import { AuthStore } from '../../../services/auth';
import { errorMessage } from '../../../services/errors';
import { Student } from '../../../models/student';
import { StudentsApi } from '../../../services/students';
import { StudentChanges } from '../../../services/student-changes';

@Component({
  selector: 'app-student',
  imports: [RouterLink],
  templateUrl: './student.html',
  styleUrl: './student.css',
})
export class StudentPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentsApi);
  private changes = inject(StudentChanges);
  private destroy = inject(DestroyRef);
  readonly auth = inject(AuthStore);
  readonly student = signal<Student | null>(null);
  readonly loading = signal(true);
  readonly deleting = signal(false);
  readonly error = signal('');
  ngOnInit(): void {
    merge(of(undefined), this.changes.changes$)
      .pipe(
        switchMap(() => this.api.get(this.route.snapshot.paramMap.get('id') || '').pipe(
          map((student) => ({ student, error: '' })),
          catchError((error) => of({ student: null, error: errorMessage(error) })),
        )),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((result) => {
        this.student.set(result.student);
        this.error.set(result.error);
        this.loading.set(false);
      });
  }
  remove(): void {
    const student = this.student();
    if (
      !student ||
      !this.auth.isAdmin() ||
      this.deleting() ||
      !confirm(`Удалить ${student.fullName}?`)
    )
      return;
    this.deleting.set(true);
    this.api
      .delete(student.isuId)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/students'),
        error: (err) => this.error.set(errorMessage(err)),
      });
  }
}
