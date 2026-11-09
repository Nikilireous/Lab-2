import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthStore } from '../core/auth';
import { errorMessage } from '../core/errors';
import { Student } from '../core/models';
import { StudentsApi } from '../core/students';

@Component({
  selector: 'app-student',
  imports: [RouterLink],
  templateUrl: './student.html',
})
export class StudentPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentsApi);
  readonly auth = inject(AuthStore);
  readonly student = signal<Student | null>(null);
  readonly loading = signal(true);
  readonly deleting = signal(false);
  readonly error = signal('');
  ngOnInit(): void {
    this.api.get(this.route.snapshot.paramMap.get('id') || '').subscribe({
      next: (value) => {
        this.student.set(value);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
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
