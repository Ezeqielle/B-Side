import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HistoryApi } from '../../core/history-api';
import { PlaylistsApi } from '../../core/playlists-api';
import { TrackPreview, trackArtwork } from '../../core/track-preview';
import { PlaylistTable } from './playlist-table';
import { SincePipe } from './since';

/**
 * Stats des playlists, croisées avec l'historique d'écoute. Les playlists sont recopiées
 * depuis Spotify par le worker : la page lance la synchro, puis attend qu'elle se termine.
 */
@Component({
  selector: 'app-playlists-page',
  imports: [
    DecimalPipe,
    PercentPipe,
    RouterLink,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmSkeletonImports,
    PlaylistTable,
    SincePipe,
    TrackPreview,
  ],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Tes playlists</h1>
        <p class="text-muted-foreground text-sm">
          Croisées avec ton historique : un titre ne compte comme écouté qu'au-delà de 30 secondes.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <p class="text-muted-foreground text-sm" role="status">
          @if (syncing()) {
            Synchronisation avec Spotify…
          } @else if (syncFailed()) {
            <span class="text-destructive">La synchronisation a échoué.</span>
          } @else if (syncedAt(); as date) {
            Synchronisé {{ date | since }}
          }
        </p>
        <a hlmBtn variant="ghost" size="sm" routerLink="/playlists/passes">Titres passés</a>
        <button hlmBtn variant="outline" size="sm" [disabled]="syncing()" (click)="sync()">
          Synchroniser
        </button>
      </div>
    </div>

    @if (noHistory()) {
      <p class="bg-muted mb-6 rounded-lg px-4 py-3 text-sm">
        Sans historique, tous les titres paraissent jamais écoutés :
        <a routerLink="/history" class="underline">importe ton historique</a> pour des stats justes.
      </p>
    }

    @if (overview.error() || playlists.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer tes playlists pour le moment.</p>
    } @else if (overview.value() && playlists.value()) {
      @let o = overview.value()!;
      @let all = playlists.value()!;
      @if (!all.length && !syncing()) {
        <p class="text-muted-foreground">
          @if (o.syncedAt) {
            Aucune playlist dont Spotify donne le contenu : seules celles que tu as créées ou dont tu es
            collaborateur sont lisibles.
          } @else {
            Tes playlists n'ont pas encore été récupérées.
          }
        </p>
      } @else {
        <div class="grid gap-6 transition-opacity" [class.opacity-60]="syncing()">
          <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div class="bg-card rounded-xl border px-4 py-3">
              <dt class="text-muted-foreground text-sm">Playlists</dt>
              <dd class="mt-1 text-2xl font-semibold">{{ o.playlists | number }}</dd>
              @if (o.unreadable) {
                <dd class="text-muted-foreground text-xs">
                  + {{ o.unreadable | number }} suivies, sans accès au contenu
                </dd>
              }
            </div>
            <div class="bg-card rounded-xl border px-4 py-3">
              <dt class="text-muted-foreground text-sm">Titres différents</dt>
              <dd class="mt-1 text-2xl font-semibold">{{ o.tracks | number }}</dd>
            </div>
            <div class="bg-card rounded-xl border px-4 py-3">
              <dt class="text-muted-foreground text-sm">Jamais écoutés</dt>
              <dd class="mt-1 text-2xl font-semibold">
                {{ o.neverPlayed | number }}
                @if (o.tracks) {
                  <span class="text-muted-foreground text-base font-normal">
                    ({{ o.neverPlayed / o.tracks | percent }})
                  </span>
                }
              </dd>
            </div>
            <div class="bg-card rounded-xl border px-4 py-3">
              <dt class="text-muted-foreground text-sm">En double</dt>
              <dd class="mt-1 text-2xl font-semibold">{{ o.duplicates | number }}</dd>
            </div>
          </dl>

          <section hlmCard>
            <div hlmCardHeader>
              <h2 hlmCardTitle>Par playlist</h2>
              <p hlmCardDescription>
                Clique sur une colonne pour trier, et sur une playlist pour voir ses titres.
              </p>
            </div>
            <div hlmCardContent>
              <app-playlist-table [playlists]="all" />
            </div>
          </section>

          <div class="grid gap-6 lg:grid-cols-2">
            <section hlmCard>
              <div hlmCardHeader>
                <h2 hlmCardTitle>Titres en double</h2>
                <p hlmCardDescription>Présents dans plusieurs playlists, ou deux fois dans la même.</p>
              </div>
              <div hlmCardContent>
                <ul class="space-y-3">
                  @for (track of duplicates.value() ?? []; track track.id) {
                    <li class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
                      <app-track-preview
                        class="size-9 rounded-md"
                        [trackId]="track.id"
                        [name]="track.name"
                        [imageUrl]="track.imageUrl"
                      />
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium" [title]="track.name">{{ track.name }}</p>
                        <p class="text-muted-foreground truncate text-xs">{{ track.artistName }}</p>
                      </div>
                      <div class="col-start-2 mt-1 flex flex-wrap gap-1">
                        @for (name of track.playlists; track $index) {
                          <span hlmBadge variant="secondary">{{ name }}</span>
                        }
                      </div>
                    </li>
                  } @empty {
                    <li class="text-muted-foreground text-sm">Aucun doublon.</li>
                  }
                </ul>
              </div>
            </section>

            <section hlmCard>
              <div hlmCardHeader>
                <h2 hlmCardTitle>Absents de tes playlists</h2>
                <p hlmCardDescription>Tes titres les plus écoutés qui ne sont dans aucune playlist.</p>
              </div>
              <div hlmCardContent>
                <ol class="space-y-3">
                  @for (track of missing.value() ?? []; track track.id; let i = $index) {
                    <li class="grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-x-3">
                      <span class="text-muted-foreground text-right text-sm tabular-nums">{{ i + 1 }}</span>
                      <app-track-preview
                        class="size-9 rounded-md"
                        [trackId]="track.id"
                        [name]="track.name"
                        [imageUrl]="artwork(track)"
                      />
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium" [title]="track.name">{{ track.name }}</p>
                        <p class="text-muted-foreground truncate text-xs">
                          {{ track.artistName }} · {{ track.lastPlayedAt | since }}
                        </p>
                      </div>
                      <span class="text-sm tabular-nums">{{ track.plays | number }} écoutes</span>
                    </li>
                  } @empty {
                    <li class="text-muted-foreground text-sm">Tous tes titres écoutés sont dans une playlist.</li>
                  }
                </ol>
              </div>
            </section>
          </div>
        </div>
      }
    } @else {
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <div hlmSkeleton class="h-20 rounded-xl"></div>
        }
      </div>
      <div hlmSkeleton class="mt-6 h-96 rounded-xl"></div>
    }
  `,
})
export class PlaylistsPage {
  private readonly api = inject(PlaylistsApi);

  protected readonly overview = this.api.overview();
  protected readonly playlists = this.api.list();
  protected readonly duplicates = this.api.duplicates();
  protected readonly missing = this.api.missing(20);
  protected readonly artwork = trackArtwork;
  private readonly history = inject(HistoryApi).summary();

  protected readonly syncing = signal(false);
  protected readonly syncFailed = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly syncedAt = computed(() => this.overview.value()?.syncedAt ?? null);
  protected readonly noHistory = this.history.isEmpty;

  constructor() {
    // Première visite : les playlists n'ont jamais été récupérées. Une seule tentative automatique.
    let autoSynced = false;
    effect(() => {
      if (!autoSynced && this.overview.value()?.syncedAt === null) {
        autoSynced = true;
        this.sync();
      }
    });
  }

  /** Lance la synchro, puis attend que `syncedAt` change pour tout recharger. */
  protected sync(): void {
    if (this.syncing()) {
      return;
    }
    this.syncing.set(true);
    this.syncFailed.set(false);

    const done = () => {
      for (const resource of [this.overview, this.playlists, this.duplicates, this.missing]) {
        resource.reload();
      }
      this.syncing.set(false);
    };
    // En quittant la page, on cesse d'attendre la fin de la synchro
    this.api.sync(this.syncedAt()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      complete: done,
      error: () => {
        this.syncFailed.set(true);
        done();
      },
    });
  }
}
