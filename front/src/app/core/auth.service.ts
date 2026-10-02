import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { Me } from './models';

/**
 * Session portée par un cookie Symfony : le front ne voit jamais les tokens Spotify.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly user = signal<Me | null>(null);

  loadUser(): Observable<Me | null> {
    return this.http.get<Me>('/api/me').pipe(
      tap((user) => this.user.set(user)),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
    );
  }

  login(): void {
    window.location.assign('/api/auth/login');
  }

  logout(): void {
    window.location.assign('/api/auth/logout');
  }
}
