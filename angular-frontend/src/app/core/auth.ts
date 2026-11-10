import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, filter, finalize, fromEvent, Observable, shareReplay, tap, throwError, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthData, User } from './models';

const KEY = 'lab4-auth';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);
  private router = inject(Router);
  private destroy = inject(DestroyRef);
  private state = signal<AuthData | null>(this.restore());
  readonly user = computed(() => this.state()?.user ?? null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly token = computed(() => this.state()?.accessToken ?? null);
  private pendingRefresh?: Observable<{ accessToken: string }>;

  constructor() {
    localStorage.removeItem('lab3-auth');
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(filter((event) => event.key === KEY), takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        this.state.set(this.restore());
        if (this.token() && ['/login', '/register'].includes(this.router.url))
          this.router.navigateByUrl('/students');
        else if (!this.token() && !['/login', '/register'].includes(this.router.url))
          this.router.navigateByUrl('/login');
      });
  }

  private restore(): AuthData | null {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      return raw?.accessToken && raw?.refreshToken && raw?.user ? (raw as AuthData) : null;
    } catch {
      return null;
    }
  }
  private save(value: AuthData): void {
    this.state.set(value);
    localStorage.setItem(KEY, JSON.stringify(value));
  }
  login(username: string, password: string): Observable<AuthData> {
    return this.http
      .post<AuthData>('/api/auth/login', { username, password })
      .pipe(tap((data) => this.save(data)));
  }
  register(username: string, email: string, password: string): Observable<AuthData> {
    return this.http
      .post<AuthData>('/api/auth/register', { username, email, password })
      .pipe(tap((data) => this.save(data)));
  }
  me(): Observable<User> {
    return this.http.get<User>('/api/auth/me').pipe(
      tap((user) => {
        const current = this.state();
        if (current) this.save({ ...current, user });
      }),
    );
  }
  refresh(): Observable<{ accessToken: string }> {
    if (this.pendingRefresh) return this.pendingRefresh;
    const current = this.state();
    if (!current?.refreshToken) return throwError(() => new Error('Нет refresh-токена'));
    this.pendingRefresh = this.http
      .post<{ accessToken: string }>('/api/auth/refresh', {
        refreshToken: current.refreshToken,
      })
      .pipe(
        tap((result) => {
          if (this.state()?.refreshToken === current.refreshToken)
            this.save({ ...current, accessToken: result.accessToken });
        }),
        finalize(() => {
          this.pendingRefresh = undefined;
        }),
        shareReplay(1),
      );
    return this.pendingRefresh;
  }
  logout(): void {
    const refreshToken = this.state()?.refreshToken;
    if (refreshToken)
      this.http.post('/api/auth/logout', { refreshToken }).subscribe({ error: () => {} });
    this.state.set(null);
    localStorage.removeItem(KEY);
    this.router.navigateByUrl('/login');
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStore);
  if (
    !request.url.startsWith('/api/') ||
    request.url.startsWith('/api/auth/login') ||
    request.url.startsWith('/api/auth/register') ||
    request.url.startsWith('/api/auth/refresh') ||
    request.url.startsWith('/api/auth/logout')
  )
    return next(request);
  const token = auth.token();
  const authorized = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authorized).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token)
        return throwError(() => error);
      return auth.refresh().pipe(
        switchMap(({ accessToken }) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })),
        ),
        catchError((refreshError) => {
          if (refreshError.status === 401) auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.token() ? true : inject(Router).createUrlTree(['/login']);
};
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/students']);
};
