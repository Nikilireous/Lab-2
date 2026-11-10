import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthStore } from '../core/auth';
import { errorMessage } from '../core/errors';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthStore);
  private router = inject(Router);
  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly loading = signal(false);
  readonly error = signal('');
  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const { username, email, password } = this.form.getRawValue();
    this.auth
      .register(username.trim(), email.trim(), password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/students'),
        error: (err) => this.error.set(errorMessage(err)),
      });
  }
}
