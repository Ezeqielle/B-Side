import { DatePipe, DecimalPipe, Location, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HistoryApi } from '../../core/history-api';
import { PlaylistTrackStat } from '../../core/models';
import { PlaylistsApi } from '../../core/playlists-api';
import { TrackPreview } from '../../core/track-preview';
import { CleanupPanel } from './cleanup-panel';
import { PRESETS, matchesRules, paramsOf, rulesOf } from './cleanup-rules';
import { PlaylistCover } from './playlist-cover';
import { removal } from './removal';
import { RemovalOutcome, RemoveTracks } from './remove-tracks';
import { SincePipe } from './since';
import { Sort, SortHeader, sortRows } from './sort-header';

/** Lignes affichées d'un coup : les titres likés se comptent par milliers. */
const PAGE_SIZE = 100;

const COLUMNS: Record<string, (track: PlaylistTrackStat) => string | number | null> = {
  position: (t) => t.position,
  name: (t) => t.name,
  plays: (t) => t.plays,
  skipRate: (t) => (t.plays ? t.skipRate : null),
  lastPlayedAt: (t) => t.lastPlayedAt && Date.parse(t.lastPlayedAt),
  addedAt: (t) => t.addedAt && Date.parse(t.addedAt),
};

/**
 * Titres d'une playlist avec leurs écoutes. En mode nettoyage, les règles (gardées dans l'URL)
 * présélectionnent des titres, que l'on peut décocher avant de les retirer. Un titre décoché est
 * enregistré comme titre à garder : il reste décoché aux nettoyages suivants, quelles que soient les règles.
 */
@Component({
  selector: 'app-playlist-page',
  imports: [
    DatePipe,
    DecimalPipe,
    PercentPipe,
    RouterLink,
    HlmButtonImports,
    HlmCardImports,
    HlmCheckboxImports,
    HlmSkeletonImports,
    CleanupPanel,
    PlaylistCover,
    RemovalOutcome,
    RemoveTracks,
    SincePipe,
    SortHeader,
    TrackPreview,
  ],
  template: `
    <a routerLink="/playlists" class="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm">
      ← Toutes les playlists
    </a>

    @if (playlist.value(); as p) {
      <div class="mb-6 flex items-center gap-4">
        <app-playlist-cover class="size-20 sm:size-24" [playlist]="p" />
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-bold tracking-tight">{{ p.name }}</h1>
          <p class="text-muted-foreground text-sm">
            {{ p.tracks | number }} titres · {{ p.artists | number }} artistes · {{ duration() }}
          </p>
          <p class="text-muted-foreground text-sm">
            Dernière écoute {{ p.lastPlayedAt | since: 'jamais' }} · dernier ajout {{ p.lastAddedAt | since }}
          </p>
        </div>
      </div>
    }

    <app-removal-outcome [removal]="removal" />

    @if (tracks.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer cette playlist.</p>
    } @else if (tracks.value() && (!rules() || kept.value() || kept.error())) {
      <section hlmCard>
        <div hlmCardHeader class="flex flex-wrap items-center justify-between gap-2">
          <h2 hlmCardTitle>Titres</h2>
          <div class="flex gap-1">
            <a hlmBtn size="xs" variant="ghost" [routerLink]="['/playlists', id(), 'doublons']">Doublons</a>
            <a hlmBtn size="xs" variant="ghost" [routerLink]="['/playlists', id(), 'a-garder']">Titres à garder</a>
            <a hlmBtn size="xs" variant="ghost" routerLink="/playlists/passes">Titres passés</a>
            @if (rules()) {
              <button hlmBtn size="xs" variant="ghost" (click)="rules.set(null)">Fermer le nettoyage</button>
            } @else {
              <button hlmBtn size="xs" variant="outline" (click)="rules.set(presets[0].rules)">Nettoyer</button>
            }
          </div>
        </div>
        <div hlmCardContent>
          @if (rules(); as r) {
            <app-cleanup-panel class="mb-4" [rules]="r" (rulesChange)="rules.set($event)" [reference]="reference()" />

            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm" role="status">
                <strong>{{ selected().length | number }}</strong> titres sélectionnés sur
                {{ tracks.value()!.length | number }}
                @if (candidates().length - selected().length; as kept) {
                  <span class="text-muted-foreground">({{ kept | number }} à garder, décochés)</span>
                }
              </p>
              <app-remove-tracks [removal]="removal" />
            </div>
          }

          <div class="-mx-6 overflow-x-auto px-6">
            <table class="w-full text-sm">
              <thead class="text-muted-foreground border-b text-left text-xs whitespace-nowrap">
                <tr>
                  @if (rules()) {
                    <th class="w-8 pb-2" scope="col">
                      <hlm-checkbox
                        aria-label="Tout sélectionner"
                        [disabled]="removal.locked()"
                        [checked]="selected().length === candidates().length"
                        [indeterminate]="!!selected().length && selected().length < candidates().length"
                        (checkedChange)="excludeAll(!$event)"
                      />
                    </th>
                  }
                  <th class="w-10 pb-2 text-right" appSortHeader="position" [desc]="false" [(sort)]="sort">#</th>
                  <th class="pb-2 pl-3" appSortHeader="name" [desc]="false" [(sort)]="sort">Titre</th>
                  <th class="pb-2 pl-4 text-right" appSortHeader="plays" [(sort)]="sort">Écoutes</th>
                  <th class="hidden pb-2 pl-4 text-right sm:table-cell" appSortHeader="skipRate" [(sort)]="sort">Passés</th>
                  <th class="pb-2 pl-4 text-right" appSortHeader="lastPlayedAt" [desc]="false" [(sort)]="sort">
                    Dernière écoute
                  </th>
                  <th class="hidden pb-2 pl-4 text-right md:table-cell" appSortHeader="addedAt" [desc]="false" [(sort)]="sort">
                    Ajouté le
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (track of shownRows(); track track.position) {
                  <tr class="border-b last:border-0" [class.opacity-50]="rules() && excluded().has(track.id)">
                    @if (rules()) {
                      <td class="py-2">
                        <hlm-checkbox
                          [aria-label]="'Retirer ' + track.name"
                          [disabled]="removal.locked()"
                          [checked]="!excluded().has(track.id)"
                          (checkedChange)="exclude(track.id, !$event)"
                        />
                      </td>
                    }
                    <td class="text-muted-foreground py-2 text-right tabular-nums">{{ track.position + 1 }}</td>
                    <td class="w-full max-w-0 py-2 pr-4 pl-3">
                      <div class="flex items-center gap-3">
                        <app-track-preview
                          class="size-9 rounded-md"
                          [trackId]="track.id"
                          [name]="track.name"
                          [imageUrl]="track.imageUrl"
                        />
                        <div class="min-w-0">
                          <p class="truncate font-medium" [title]="track.name">{{ track.name }}</p>
                          <p class="text-muted-foreground truncate text-xs">{{ track.artistName }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="py-2 pl-4 text-right tabular-nums" [class.text-muted-foreground]="!track.plays">
                      {{ track.plays | number }}
                    </td>
                    <td class="hidden py-2 pl-4 text-right tabular-nums sm:table-cell">
                      {{ track.starts ? (track.skipRate | percent) : '—' }}
                    </td>
                    <td class="py-2 pl-4 text-right whitespace-nowrap">{{ track.lastPlayedAt | since: 'jamais' }}</td>
                    <td class="text-muted-foreground hidden py-2 pl-4 text-right whitespace-nowrap md:table-cell">
                      {{ track.addedAt ? (track.addedAt | date: 'd MMM yyyy') : '—' }}
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="rules() ? 7 : 6" class="text-muted-foreground py-4 text-center">
                      {{ rules() ? 'Aucun titre ne répond à ces règles.' : 'Aucun titre.' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (rows().length > shown()) {
            <div class="mt-4 flex justify-center">
              <button hlmBtn variant="outline" size="sm" (click)="shown.set(shown() + pageSize)">
                Afficher plus ({{ rows().length - shown() | number }} restants)
              </button>
            </div>
          }
        </div>
      </section>
    } @else {
      <div hlmSkeleton class="h-96 rounded-xl"></div>
    }
  `,
})
export class PlaylistPage {
  /** Id Spotify, depuis l'URL. */
  readonly id = input.required<string>();
  /** Règles de nettoyage, depuis l'URL (voir CleanupParams). */
  readonly added = input<string>();
  readonly never = input<string>();
  readonly idle = input<string>();
  readonly skip = input<string>();
  readonly starts = input<string>();

  protected readonly presets = PRESETS;
  protected readonly sort = signal<Sort>({ key: 'position', desc: false });

  private readonly api = inject(PlaylistsApi);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly playlist = this.api.playlist(this.id);
  protected readonly tracks = this.api.tracks(this.id);
  protected readonly kept = this.api.kept(this.id);
  private readonly history = inject(HistoryApi).summary();

  protected readonly duration = computed(() => {
    const minutes = Math.round((this.playlist.value()?.durationMs ?? 0) / 60_000);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  });

  /** Règles de nettoyage, `null` hors nettoyage. Modifiées ici, elles sont recopiées dans l'URL. */
  protected readonly rules = linkedSignal(() =>
    rulesOf({ added: this.added(), never: this.never(), idle: this.idle(), skip: this.skip(), starts: this.starts() }),
  );

  /** Dernière écoute importée : les durées des règles se comptent jusque-là. */
  protected readonly reference = computed(() => this.history.value()?.lastPlayedAt ?? null);

  /** Titres retenus par les règles, ou tous hors nettoyage. */
  protected readonly candidates = computed(() => {
    const tracks = this.tracks.value() ?? [];
    const rules = this.rules();
    if (!rules) {
      return tracks;
    }
    const reference = Date.parse(this.reference() ?? '') || Date.now();
    return tracks.filter((track) => matchesRules(track, rules, reference));
  });

  /** Ids des titres à garder, décochés : enregistrés à chaque clic, relus en changeant de playlist. */
  protected readonly excluded = linkedSignal<ReadonlySet<string>>(
    () => new Set((this.kept.value() ?? []).map((track) => track.id)),
  );

  protected readonly selected = computed(() =>
    this.candidates().filter((track) => !this.excluded().has(track.id)),
  );

  protected readonly rows = computed(() => {
    const { key, desc } = this.sort();
    return sortRows(this.candidates(), COLUMNS[key], desc);
  });

  protected readonly pageSize = PAGE_SIZE;
  /** Nombre de lignes affichées, remis à une page à chaque changement de playlist, de règles ou de tri. */
  protected readonly shown = linkedSignal({
    source: () => [this.id(), this.rules(), this.sort()],
    computation: () => PAGE_SIZE,
  });
  protected readonly shownRows = computed(() => this.rows().slice(0, this.shown()));

  protected readonly removal = removal({
    targets: () => [
      {
        id: this.id(),
        name: this.playlist.value()?.name ?? '',
        tracks: this.selected().map(({ position, id }) => ({ position, id })),
      },
    ],
    sources: [this.playlist, this.tracks],
  });

  constructor() {
    // Règles dans l'URL, sans navigation : glisser un curseur ne recharge rien
    effect(() => {
      const rules = this.rules();
      const url = this.router.parseUrl(this.router.url);
      url.queryParams = rules ? paramsOf(rules) : {};
      this.location.replaceState(this.router.serializeUrl(url));
    });
  }

  protected exclude(trackId: string, excluded: boolean): void {
    this.keep([trackId], excluded);
  }

  /** Décoche (garde) ou recoche tous les titres retenus par les règles. */
  protected excludeAll(excluded: boolean): void {
    this.keep([...new Set(this.candidates().map((track) => track.id))], excluded);
  }

  /** Coche ou décoche tout de suite, puis enregistre ; en cas d'échec, la liste enregistrée est relue. */
  private keep(trackIds: string[], kept: boolean): void {
    if (!trackIds.length) {
      return;
    }
    this.excluded.update((set) => {
      const next = new Set(set);
      for (const id of trackIds) {
        if (kept) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
    this.api.keep(this.id(), trackIds, kept).subscribe({ error: () => this.kept.reload() });
  }
}
