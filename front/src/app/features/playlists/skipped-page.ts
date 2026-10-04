import { DecimalPipe, Location, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { concatMap, from } from 'rxjs';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HistoryApi } from '../../core/history-api';
import { SkipFilter, SkippedSong } from '../../core/models';
import { paged } from '../../core/paged';
import { PlaylistsApi } from '../../core/playlists-api';
import { TrackPreview, trackArtwork } from '../../core/track-preview';
import { SincePipe } from './since';
import { SkipFilterPanel } from './skip-filter-panel';
import { skipFilterOf, skipParamsOf } from './skip-filter';

const LIMIT = 30;

/** À partir de ce nombre de passages, un morceau ressort. */
const OFTEN = 3;

/**
 * Derniers morceaux passés parmi ceux des playlists et des likes, avec leur nombre total de passages.
 * Un morceau coché est retiré de toutes les playlists qui le contiennent, toutes versions et likes compris.
 */
@Component({
  selector: 'app-skipped-page',
  imports: [
    DecimalPipe,
    PercentPipe,
    RouterLink,
    HlmAlertDialogImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmSkeletonImports,
    SincePipe,
    SkipFilterPanel,
    TrackPreview,
  ],
  template: `
    <a routerLink="/playlists" class="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm">
      ← Toutes les playlists
    </a>

    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Titres passés</h1>
      <p class="text-muted-foreground text-sm">
        Tes derniers morceaux passés parmi ceux de tes playlists et de tes likes, avec le nombre de fois où tu les
        as passés. Un morceau coché est retiré de toutes les playlists qui le contiennent, toutes versions et likes
        compris.
      </p>
      @if (history.value()?.lastPlayedAt; as last) {
        <p class="text-muted-foreground text-sm">
          D'après ton historique importé, dont la dernière écoute date {{ last | since }}.
        </p>
      }
    </div>

    <app-skip-filter-panel class="mb-6" [(filter)]="filter" />

    @if (outcome(); as message) {
      <p class="bg-muted mb-6 rounded-lg px-4 py-3 text-sm" role="status">
        {{ message }} <a routerLink="/journal" class="underline">Voir le journal</a>
      </p>
    }

    @if (songs.isLoading() && !songs.items().length) {
      <div hlmSkeleton class="h-96 rounded-xl"></div>
    } @else if (songs.error() && !songs.items().length) {
      <p class="text-destructive" role="alert">Impossible de récupérer tes titres passés.</p>
    } @else if (songs.items().length) {
      <div
        class="bg-background/80 sticky top-14 z-[5] mb-4 flex flex-wrap items-center justify-between gap-3 border-b py-3 backdrop-blur"
      >
        <p class="text-sm" role="status">
          <strong>{{ checkedSongs() | number }}</strong> morceaux sélectionnés
          @if (positions()) {
            <span class="text-muted-foreground">
              ({{ positions() | number }} titres dans {{ targets().length | number }} playlists)
            </span>
          }
        </p>
        <hlm-alert-dialog>
          <button
            hlmAlertDialogTrigger
            hlmBtn
            size="sm"
            variant="destructive"
            [disabled]="!positions() || removing() || stale()"
          >
            {{ removing() ? 'Retrait en cours…' : 'Retirer ' + (positions() | number) + ' titres' }}
          </button>
          <hlm-alert-dialog-content *hlmAlertDialogPortal="let ctx">
            <hlm-alert-dialog-header>
              <h2 hlmAlertDialogTitle>
                Retirer {{ positions() | number }} titres de {{ targets().length | number }} playlists ?
              </h2>
              <p hlmAlertDialogDescription>
                {{ playlistNames() }}. Ils sont d'abord copiés dans ta playlist « Spotylist · Corbeille », et notés
                dans le journal : tu pourras les remettre en place.
              </p>
            </hlm-alert-dialog-header>
            <hlm-alert-dialog-footer>
              <button hlmAlertDialogCancel variant="outline">Annuler</button>
              <button hlmAlertDialogAction variant="destructive" (click)="ctx.close(); remove()">Retirer</button>
            </hlm-alert-dialog-footer>
          </hlm-alert-dialog-content>
        </hlm-alert-dialog>
      </div>

      <ul class="bg-card divide-y rounded-xl border transition-opacity" [class.opacity-60]="songs.isLoading()">
        @for (song of songs.items(); track song.id) {
          @let checked = selected().has(song.id);
          <li class="flex items-center gap-3 px-4 py-2" [class.bg-destructive/10]="checked">
            <hlm-checkbox
              [aria-label]="'Retirer ' + song.name + ' de ses playlists'"
              [disabled]="removing() || stale()"
              [checked]="checked"
              (checkedChange)="toggle(song.id, $event)"
            />
            <app-track-preview
              class="size-9 rounded-md"
              [trackId]="song.id"
              [name]="song.name"
              [imageUrl]="artwork(song)"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium" [class.line-through]="checked" [title]="song.name">
                {{ song.name }}
              </p>
              <p class="text-muted-foreground truncate text-xs">
                {{ song.artistName }} · passé {{ song.skippedAt | since }}
              </p>
              <div class="mt-1 flex flex-wrap gap-1">
                @for (playlist of song.playlists; track playlist.id) {
                  <span hlmBadge variant="secondary">{{ playlist.name }}</span>
                }
              </div>
            </div>
            <div class="shrink-0 text-right">
              <span hlmBadge [variant]="song.skips >= often ? 'destructive' : 'outline'" class="tabular-nums">
                passé {{ song.skips | number }} fois
              </span>
              <p class="text-muted-foreground mt-1 hidden text-xs tabular-nums sm:block">
                sur {{ song.starts | number }} écoutes ({{ song.skips / song.starts | percent }})
              </p>
            </div>
          </li>
        }
      </ul>

      @if (songs.hasMore()) {
        <div class="mt-6 flex flex-col items-center gap-2">
          @if (songs.error()) {
            <p class="text-destructive text-sm" role="alert">Impossible de charger la suite.</p>
          }
          <button hlmBtn variant="outline" size="sm" [disabled]="songs.loadingMore()" (click)="songs.more()">
            {{ songs.loadingMore() ? 'Chargement…' : 'Charger plus' }}
          </button>
        </div>
      }
    } @else if (filter().minSkips || filter().minRate) {
      <p class="text-muted-foreground">Aucun titre de tes playlists ne passe ces seuils.</p>
    } @else {
      <p class="text-muted-foreground">
        Aucun titre de tes playlists passé : <a routerLink="/history" class="underline">importe ton historique</a>
        pour les voir ici.
      </p>
    }
  `,
})
export class SkippedPage {
  /** Seuils depuis l'URL (voir SkipParams). */
  readonly skips = input<string>();
  readonly rate = input<string>();

  private readonly api = inject(PlaylistsApi);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly history = inject(HistoryApi).summary();
  protected readonly artwork = trackArtwork;
  protected readonly often = OFTEN;

  /** Seuils de la liste. Modifiés ici, ils sont recopiés dans l'URL. */
  protected readonly filter = linkedSignal<SkipFilter>(() =>
    skipFilterOf({ skips: this.skips(), rate: this.rate() }),
  );

  protected readonly songs = paged<SkippedSong>({
    reset: this.filter,
    first: LIMIT,
    keepPrevious: true,
    load: (page) => this.api.skipped(this.filter, page),
  });

  /** Morceaux cochés, par id. */
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly removing = signal(false);
  protected readonly outcome = signal<string | null>(null);

  /** Vrai après un retrait, jusqu'à la relecture de la liste : les positions ont changé. */
  protected readonly stale = linkedSignal({ source: this.songs.items, computation: () => false });

  /** Titres à retirer, par playlist. */
  protected readonly targets = computed(() => {
    const byPlaylist = new Map<string, { id: string; name: string; positions: number[] }>();
    for (const song of this.songs.items()) {
      if (!this.selected().has(song.id)) {
        continue;
      }
      for (const playlist of song.playlists) {
        const target = byPlaylist.get(playlist.id) ?? { ...playlist, positions: [] };
        target.positions.push(...playlist.positions);
        byPlaylist.set(playlist.id, target);
      }
    }
    return [...byPlaylist.values()];
  });

  /** Morceaux cochés parmi ceux affichés : un changement de seuils peut en cacher. */
  protected readonly checkedSongs = computed(
    () => this.songs.items().filter((song) => this.selected().has(song.id)).length,
  );

  protected readonly positions = computed(() =>
    this.targets().reduce((total, target) => total + target.positions.length, 0),
  );

  protected readonly playlistNames = computed(() =>
    this.targets()
      .map((target) => `« ${target.name} »`)
      .join(', '),
  );

  constructor() {
    // Seuils dans l'URL, sans navigation : glisser un curseur ne recharge que la liste
    effect(() => {
      const url = this.router.parseUrl(this.router.url);
      url.queryParams = skipParamsOf(this.filter());
      this.location.replaceState(this.router.serializeUrl(url));
    });
  }

  protected toggle(id: string, checked: boolean): void {
    this.selected.update((selected) => {
      const next = new Set(selected);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  /** Une playlist après l'autre : chaque retrait décale les positions de sa seule playlist. */
  protected remove(): void {
    this.removing.set(true);
    let removed = 0;
    from(this.targets())
      .pipe(concatMap((target) => this.api.remove(target.id, target.positions)))
      .subscribe({
        next: (result) => (removed += result.removed),
        complete: () =>
          this.done(`${removed} titre${removed > 1 ? 's' : ''} retiré${removed > 1 ? 's' : ''}, et mis dans la corbeille.`),
        error: () => this.done("Le retrait s'est interrompu : les titres déjà retirés sont dans la corbeille."),
      });
  }

  private done(message: string): void {
    this.removing.set(false);
    this.selected.set(new Set());
    this.outcome.set(message);
    this.stale.set(true);
    this.songs.reload();
  }
}
