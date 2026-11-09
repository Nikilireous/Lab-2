import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from './core/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App implements OnInit {
  readonly auth = inject(AuthStore);
  ngOnInit(): void {
    if (this.auth.token()) this.auth.me().subscribe({ error: () => {} });
  }
}
