import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideVolume2, lucideVolumeX } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../core/auth.service';
import { PreviewPlayer } from '../core/preview-player';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, HlmAvatarImports, HlmButtonImports],
  viewProviders: [provideIcons({ lucideVolume2, lucideVolumeX })],
  template: `
    <header class="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <a routerLink="/" class="text-lg font-bold tracking-tight">B-Side</a>
        <nav class="text-muted-foreground flex gap-4 text-sm">
          <a routerLink="/top" routerLinkActive="text-foreground" class="hover:text-foreground transition-colors">Tops</a>
          <a routerLink="/stats" routerLinkActive="text-foreground" class="hover:text-foreground transition-colors">Stats</a>
          <a routerLink="/playlists" routerLinkActive="text-foreground" class="hover:text-foreground transition-colors">Playlists</a>
          <a routerLink="/journal" routerLinkActive="text-foreground" class="hover:text-foreground transition-colors">Journal</a>
          <a routerLink="/history" routerLinkActive="text-foreground" class="hover:text-foreground transition-colors">Historique</a>
        </nav>
        <div class="ml-auto flex items-center gap-3">
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            aria-label="Extraits au survol"
            [attr.aria-pressed]="previews.enabled()"
            [title]="previews.enabled() ? 'Couper les extraits au survol' : 'Activer les extraits au survol'"
            (click)="previews.toggle()"
          >
            <ng-icon [name]="previews.enabled() ? 'lucideVolume2' : 'lucideVolumeX'" size="1.1em" />
          </button>
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
  protected readonly previews = inject(PreviewPlayer);

  protected readonly initials = computed(() =>
    (this.auth.user()?.displayName ?? '?').slice(0, 2).toUpperCase(),
  );
}
