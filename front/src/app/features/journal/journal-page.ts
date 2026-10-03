import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { LIKED_PLAYLIST_ID, RemovedTrack } from '../../core/models';
import { RemovalsApi } from '../../core/removals-api';
import { TrackPreview } from '../../core/track-preview';
import { groupRemovals } from './removal-groups';

/**
 * Journal des titres retirés, par retrait : chacun peut être remis en place, seul ou avec tout son retrait.
 */
@Component({
  selector: 'app-journal-page',
  imports: [DatePipe, DecimalPipe, RouterLink, HlmButtonImports, HlmSkeletonImports, TrackPreview],
  template: `
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Journal</h1>
      <p class="text-muted-foreground text-sm">
        Les titres retirés de tes playlists et de tes likes. Ils restent dans ta playlist « Spotylist · Corbeille »
        tant qu'ils ne sont pas remis en place.
      </p>
    </div>

    @if (outcome(); as message) {
      <p class="bg-muted mb-6 rounded-lg px-4 py-3 text-sm" role="status">{{ message }}</p>
    }

    @if (removals.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer le journal.</p>
    } @else if (removals.value()) {
      <div class="grid gap-3">
        @for (group of groups(); track group.key) {
          @let open = opened().has(group.key);
          <section class="bg-card rounded-xl border">
            <div class="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                class="hover:bg-muted -mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left"
                [attr.aria-expanded]="open"
                [attr.aria-controls]="'removal-' + $index"
                (click)="toggle(group.key)"
              >
                <span class="text-muted-foreground w-3" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
                <span class="min-w-0">
                  <span class="block truncate font-medium">{{ group.playlistName }}</span>
                  <span class="text-muted-foreground block text-xs">
                    {{ group.removedAt | date: "d MMMM yyyy 'à' HH:mm" }} · {{ group.tracks.length | number }} titres
                    @if (group.tracks.length - group.pending.length; as restored) {
                      · {{ restored | number }} remis
                    }
                  </span>
                </span>
              </button>
              @if (group.pending.length) {
                <button
                  hlmBtn
                  size="xs"
                  variant="outline"
                  [disabled]="restoring()"
                  (click)="restore(group.pending)"
                >
                  Tout remettre ({{ group.pending.length | number }})
                </button>
              }
            </div>
            @if (open) {
              <ul [id]="'removal-' + $index" class="divide-y border-t px-4">
                @for (track of group.tracks; track track.id) {
                  <li class="flex items-center gap-3 py-2">
                    <app-track-preview
                      class="size-9 rounded-md"
                      [trackId]="track.trackId"
                      [name]="track.name"
                      [imageUrl]="track.imageUrl"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium" [title]="track.name">{{ track.name }}</p>
                      <p class="text-muted-foreground truncate text-xs">
                        {{ track.artistName }}
                        @if (track.addedAt) {
                          · ajouté le {{ track.addedAt | date: 'd MMM yyyy' }}
                        }
                      </p>
                    </div>
                    @if (track.restoredAt) {
                      <span class="text-muted-foreground text-xs whitespace-nowrap">
                        Remis le {{ track.restoredAt | date: 'd MMM yyyy' }}
                      </span>
                    } @else {
                      <button hlmBtn size="xs" variant="ghost" [disabled]="restoring()" (click)="restore([track])">
                        Remettre
                      </button>
                    }
                  </li>
                }
              </ul>
            }
          </section>
        } @empty {
          <p class="text-muted-foreground">
            Rien de retiré pour l'instant : le nettoyage se fait depuis
            <a routerLink="/playlists" class="text-foreground underline">la page d'une playlist</a>.
          </p>
        }
      </div>
    } @else {
      <div hlmSkeleton class="h-64 rounded-xl"></div>
    }
  `,
})
export class JournalPage {
  private readonly api = inject(RemovalsApi);
  protected readonly removals = this.api.list();
  protected readonly groups = computed(() => groupRemovals(this.removals.value() ?? []));

  /** Retraits dépliés : le plus récent au départ. */
  protected readonly opened = linkedSignal<string | undefined, ReadonlySet<string>>({
    source: () => this.groups()[0]?.key,
    computation: (key, previous) =>
      previous?.source !== undefined ? previous.value : new Set(key ? [key] : []),
  });

  protected readonly restoring = signal(false);
  protected readonly outcome = signal<string | null>(null);

  protected toggle(key: string): void {
    this.opened.update((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  }

  protected restore(tracks: RemovedTrack[]): void {
    this.restoring.set(true);
    this.outcome.set(null);
    const done = () => {
      this.restoring.set(false);
      this.removals.reload();
    };
    this.api.restore(tracks.map((track) => track.id)).subscribe({
      next: ({ restored }) => {
        const missing = tracks.length - restored;
        const where = tracks.every((track) => track.playlistId === LIKED_PLAYLIST_ID) ? 'dans tes likes' : 'en place';
        this.outcome.set(
          `${restored} titre${restored > 1 ? 's' : ''} remis ${where}.` +
            (missing ? ` ${missing} n'ont pas pu l'être : leur playlist n'existe plus.` : ''),
        );
        done();
      },
      error: () => {
        this.outcome.set('La remise en place s\'est interrompue : réessaie, les titres déjà remis sont notés.');
        done();
      },
    });
  }
}
