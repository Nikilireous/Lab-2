import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthStore } from '../core/auth';
import { errorMessage } from '../core/errors';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage implements OnInit {
  readonly auth = inject(AuthStore);
  readonly loading = signal(true);
  readonly error = signal('');
  ngOnInit(): void {
    this.auth.me().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
