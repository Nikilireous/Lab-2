import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { errorMessage } from '../core/errors';
import { Student } from '../core/models';
import { StudentsApi } from '../core/students';

@Component({
  selector: 'app-student-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './student-form.html',
  styleUrl: './student-form.css',
})
export class StudentFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(StudentsApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.pattern(/^[A-Za-zА-Яа-яЁё -]{2,120}$/)]],
    group: ['', [Validators.required, Validators.pattern(/^[A-Z][1-4][1-5]\d{2}$/)]],
    isuId: ['', [Validators.required, Validators.pattern(/^[1-9]\d{5}$/)]],
    dormitory: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    room: [100, [Validators.required, Validators.min(100), Validators.max(599)]],
    settlementDate: ['', Validators.required],
    isForeign: false,
    notes: ['', Validators.maxLength(500)],
  });
  readonly loading = signal(!!this.id);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly serverErrors = signal<Record<string, string>>({});

  fieldError(field: keyof Student): string {
    const serverError = this.serverErrors()[field];
    if (serverError) return serverError;
    const control = this.form.controls[field];
    if (!control.touched || !control.invalid) return '';
    switch (field) {
      case 'fullName': return 'ФИО: от 2 до 120 букв; допустимы пробелы и дефисы.';
      case 'group': return 'Группа: неверный формат, пример — P3212.';
      case 'isuId': return 'ИСУ ID: ровно 6 цифр, первая не ноль.';
      case 'dormitory': return `Общежитие: введено «${control.value ?? 'пусто'}», нужен номер от 1 до 20.`;
      case 'room': return `Комната: введено «${control.value ?? 'пусто'}», нужен номер от 100 до 599.`;
      case 'settlementDate': return 'Дата заселения: выберите дату.';
      case 'notes': return 'Примечания: не более 500 символов.';
      default: return '';
    }
  }

  validationMessage(): string {
    return (['fullName', 'group', 'isuId', 'dormitory', 'room', 'settlementDate', 'notes'] as const)
      .map((field) => this.fieldError(field)).filter(Boolean).join(' ');
  }
  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.serverErrors.set({}));
    if (!this.id) return;
    this.api.get(this.id).subscribe({
      next: (student) => {
        this.form.patchValue({ ...student, notes: student.notes ?? '' });
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.serverErrors.set({});
    const student = this.form.getRawValue() as Student;
    const request = this.id ? this.api.update(this.id, student) : this.api.create(student);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => this.router.navigate(['/students', saved.isuId]),
      error: (err) => {
        this.error.set(errorMessage(err));
        const fields = err?.error?.errors;
        this.serverErrors.set(fields && typeof fields === 'object' ? fields : {});
      },
    });
  }
}
