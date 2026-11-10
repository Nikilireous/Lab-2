import { Component, inject, OnInit, signal } from '@angular/core';
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
  validationMessage(): string {
    const messages: string[] = [];
    if (this.form.controls.dormitory.invalid)
      messages.push('Общежитие указано неверно: введите номер от 1 до 20.');
    if (this.form.controls.room.invalid)
      messages.push('Комната указана неверно: введите номер от 100 до 599.');
    if (this.form.controls.fullName.invalid) messages.push('Проверьте ФИО.');
    if (this.form.controls.group.invalid) messages.push('Проверьте группу.');
    if (this.form.controls.isuId.invalid) messages.push('ИСУ ID должен содержать 6 цифр.');
    if (this.form.controls.settlementDate.invalid) messages.push('Укажите дату заселения.');
    if (this.form.controls.notes.invalid) messages.push('Примечания: максимум 500 символов.');
    return messages.join(' ');
  }
  ngOnInit(): void {
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
    const student = this.form.getRawValue() as Student;
    const request = this.id ? this.api.update(this.id, student) : this.api.create(student);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => this.router.navigate(['/students', saved.isuId]),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
