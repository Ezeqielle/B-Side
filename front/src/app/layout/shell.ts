import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HlmAvatarImports, HlmButtonImports],
  template: `
    <header class="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <a routerLink="/" class="text-lg font-bold tracking-tight">Spotylist</a>
        <nav class="text-muted-foreground flex gap-4 text-sm">
          <a routerLink="/top" routerLinkActive="text-foreground" class="hover:text-foreground transition-colors">Tops</a>
          <a routerLink="/history" routerLinkActive="text-foreground" class="hover:text-foreground transition-colors">Historique</a>
        </nav>
        <div class="ml-auto flex items-center gap-3">
          @if (auth.user(); as user) {
            <span class="hidden text-sm sm:inline">{{ user.displayName }}</span>
            <hlm-avatar>
              @if (user.avatarUrl) {
                <img hlmAvatarImage [src]="user.avatarUrl" [alt]="user.displayName ?? ''" />
              }
              <span hlmAvatarFallback>{{ initials() }}</span>
            </hlm-avatar>
          }
          <button hlmBtn variant="ghost" size="sm" (click)="auth.logout()">Déconnexion</button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <router-outlet />
    </main>
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);

  protected readonly initials = computed(() =>
    (this.auth.user()?.displayName ?? '?').slice(0, 2).toUpperCase(),
  );
}
