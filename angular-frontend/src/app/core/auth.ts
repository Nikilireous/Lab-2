import { computed, inject, Injectable, makeStateKey, PLATFORM_ID, signal, TransferState } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private transfer = inject(TransferState);
  private http = inject(HttpClient);
  private router = inject(Router);
  private state = signal<User | null>(this.transfer.get(makeStateKey<User | null>('auth-user'), null));
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private channel = this.browser ? new BroadcastChannel('lab4-session') : null;
  private pendingMe?: Observable<User>;
  private pendingRefresh?: Observable<void>;
  readonly user = this.state.asReadonly();
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly logoutError = signal('');

  constructor() {
    if (this.browser) this.transfer.remove(makeStateKey<User | null>('auth-user'));
    if (!this.channel) return;
    this.channel.onmessage = ({ data }) => {
      if (data === 'logout') this.clear();
      if (data === 'login') this.me().subscribe({
        next: () => this.router.navigateByUrl('/students'),
        error: () => {},
      });
    };
  }

  private signedIn(user: User): void {
    this.state.set(user);
    this.channel?.postMessage('login');
  }

  login(username: string, password: string): Observable<User> {
    return this.http.post<User>('/api/auth/login', { username, password })
      .pipe(tap((user) => this.signedIn(user)));
  }

  register(username: string, email: string, password: string): Observable<User> {
    return this.http.post<User>('/api/auth/register', { username, email, password })
      .pipe(tap((user) => this.signedIn(user)));
  }

  me(): Observable<User> {
    if (this.pendingMe) return this.pendingMe;
    this.pendingMe = this.http.get<User>('/api/auth/me').pipe(
      tap((user) => {
        this.state.set(user);
        if (!this.browser) this.transfer.set(makeStateKey<User | null>('auth-user'), user);
      }),
      finalize(() => { this.pendingMe = undefined; }),
      shareReplay(1),
    );
    return this.pendingMe;
  }

  ensureUser(): Observable<User> {
    return this.user() ? of(this.user()!) : this.me();
  }

  refresh(): Observable<void> {
    if (this.pendingRefresh) return this.pendingRefresh;
    this.pendingRefresh = this.http.post<void>('/api/auth/refresh', {}).pipe(
      map(() => undefined),
      finalize(() => { this.pendingRefresh = undefined; }),
      shareReplay(1),
    );
    return this.pendingRefresh;
  }

  logout(): void {
    this.logoutError.set('');
    this.http.post<void>('/api/auth/logout', {}).subscribe({
      next: () => {
        this.clear();
        this.channel?.postMessage('logout');
      },
      error: () => this.logoutError.set('Не удалось выйти: сервер недоступен. Попробуйте ещё раз.'),
    });
  }

  expire(): void {
    this.clear();
    this.channel?.postMessage('logout');
  }

  private clear(): void {
    this.state.set(null);
    this.router.navigateByUrl('/login');
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStore);
  if (!request.url.startsWith('/api/') ||
      ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout']
        .some((path) => request.url.startsWith(path))) return next(request);

  return next(request).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401)
        return throwError(() => error);
      return auth.refresh().pipe(
        switchMap(() => next(request)),
        catchError((refreshError) => {
          if (refreshError instanceof HttpErrorResponse && refreshError.status === 401)
            auth.expire();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.ensureUser().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.ensureUser().pipe(
    map((user) => user.role === 'ADMIN' ? true : router.createUrlTree(['/students'])),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
