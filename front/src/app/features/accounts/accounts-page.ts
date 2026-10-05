import { Component, computed, inject, input, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { AccountAvatar, accountName } from '../../core/account-avatar';
import { AccountsApi } from '../../core/accounts-api';
import { AuthService } from '../../core/auth.service';

const ERRORS: Record<string, string> = {
  same: "C'est le compte avec lequel tu es connecté. Choisis l'autre chez Spotify (« Ce n'est pas vous ? »).",
  failed:
    "La liaison n'a pas abouti. Vérifie que ce compte fait partie des utilisateurs de l'app dans le dashboard Spotify, puis réessaie.",
};

/**
 * Comptes Spotify liés : on peut y copier ses playlists. Lier un compte, c'est s'y connecter chez Spotify
 * depuis cette session ; Spotify revient ensuite ici, avec `?error=` en cas d'échec.
 */
@Component({
  selector: 'app-accounts-page',
  imports: [AccountAvatar, HlmButtonImports, HlmSkeletonImports],
  template: `
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Comptes liés</h1>
      <p class="text-muted-foreground text-sm">
        Tes autres comptes Spotify. Tu peux y copier tes playlists depuis
        {{ auth.user()?.displayName ?? 'ce compte' }}.
      </p>
    </div>

    @if (message(); as text) {
      <p class="text-destructive mb-6" role="alert">{{ text }}</p>
    }

    @if (accounts.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer les comptes liés.</p>
    } @else if (accounts.value(); as list) {
      <div class="grid max-w-xl gap-3">
        @for (account of list; track account.id) {
          <section class="bg-card flex items-center gap-3 rounded-xl border px-4 py-3">
            <app-account-avatar [account]="account" />
            <span class="min-w-0 flex-1 truncate font-medium">{{ accountName(account) }}</span>
            <button
              hlmBtn
              size="sm"
              variant="ghost"
              [attr.aria-label]="'Délier ' + accountName(account)"
              [disabled]="unlinking()"
              (click)="unlink(account.id)"
            >
              Délier
            </button>
          </section>
        } @empty {
          <p class="text-muted-foreground text-sm">Aucun compte lié.</p>
        }
        <div>
          <button hlmBtn variant="outline" (click)="api.link()">Lier un autre compte Spotify</button>
          <p class="text-muted-foreground mt-2 text-sm">
            Spotify te demandera quel compte autoriser : choisis l'autre avec « Ce n'est pas vous ? ».
          </p>
        </div>
      </div>
    } @else {
      <div hlmSkeleton class="h-32 max-w-xl rounded-xl"></div>
    }
  `,
})
export class AccountsPage {
  /** Échec de la liaison, depuis l'URL. */
  readonly error = input<string>();

  protected readonly auth = inject(AuthService);
  protected readonly api = inject(AccountsApi);
  protected readonly accounts = this.api.list();
  protected readonly accountName = accountName;

  protected readonly unlinking = signal(false);
  private readonly unlinkFailed = signal(false);

  protected readonly message = computed(() =>
    this.unlinkFailed() ? "Le compte n'a pas pu être délié." : ERRORS[this.error() ?? ''],
  );

  protected unlink(id: string): void {
    this.unlinking.set(true);
    this.unlinkFailed.set(false);
    this.api.unlink(id).subscribe({
      next: () => {
        this.unlinking.set(false);
        this.accounts.reload();
      },
      error: () => {
        this.unlinking.set(false);
        this.unlinkFailed.set(true);
      },
    });
  }
}
