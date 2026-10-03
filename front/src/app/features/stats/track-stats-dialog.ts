import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DOCUMENT, Service, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmDialogImports, HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PreviewPlayer } from '../../core/preview-player';
import { StatsApi } from '../../core/stats-api';
import { PlaylistCover } from '../playlists/playlist-cover';
import { TimelineChart } from './timeline-chart';

/** Ce que la popup affiche avant d'avoir chargé l'historique. */
export interface StatsTrack {
  /** Id Spotify. */
  id: string;
  name: string;
  artist: string;
  imageUrl: string | null;
}

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/**
 * Ouvre l'historique d'un titre dans une popup. Son extrait joue tant qu'elle est ouverte, et continue
 * après si le focus clavier revient sur sa vignette.
 */
@Service()
export class TrackStats {
  private readonly dialog = inject(HlmDialogService);
  private readonly player = inject(PreviewPlayer);
  private readonly document = inject(DOCUMENT);

  open(track: StatsTrack): void {
    const ref = this.dialog.open(TrackStatsDialog, {
      context: track,
      closeLabel: 'Fermer',
      contentClass: 'sm:max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto',
    });
    this.player.hold(track.id);
    ref.closed$.subscribe(() => {
      const focused = this.document.activeElement;
      this.player.release(
        !!focused?.matches(':focus-visible') && !!focused.closest('[data-playing]'),
      );
    });
  }
}

/**
 * Historique d'un morceau, toutes versions confondues : écoutes, like, écoutes par mois et playlists.
 */
@Component({
  selector: 'app-track-stats-dialog',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    HlmDialogImports,
    HlmSkeletonImports,
    PlaylistCover,
    TimelineChart,
  ],
  host: { class: 'grid gap-6' },
  template: `
    <div hlmDialogHeader class="flex-row items-center gap-4 pe-8">
      <div class="bg-muted size-16 shrink-0 overflow-hidden rounded-lg">
        @if (track.imageUrl && !failed()) {
          <img
            class="size-full object-cover"
            [src]="track.imageUrl"
            alt=""
            decoding="async"
            (error)="failed.set(true)"
          />
        }
      </div>
      <div class="min-w-0">
        <h2 hlmDialogTitle class="truncate text-lg font-semibold" [title]="track.name">
          {{ track.name }}
        </h2>
        <p hlmDialogDescription class="text-muted-foreground mt-1 truncate">
          {{ track.artist }}
        </p>
      </div>
    </div>

    @if (song.error()) {
      <p class="text-destructive" role="alert">Impossible de charger l'historique de ce titre.</p>
    } @else if (song.value(); as s) {
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border px-4 py-3">
          <dt class="text-muted-foreground">Écoutes</dt>
          <dd class="mt-1 text-2xl font-semibold tabular-nums">{{ s.plays | number }}</dd>
        </div>
        <div class="rounded-xl border px-4 py-3">
          <dt class="text-muted-foreground">Temps d'écoute</dt>
          <dd class="mt-1 text-2xl font-semibold tabular-nums">{{ duration() }}</dd>
        </div>
        <div class="rounded-xl border px-4 py-3">
          <dt class="text-muted-foreground">Moment préféré</dt>
          <dd class="mt-1 text-base font-semibold">{{ moment() ?? '—' }}</dd>
        </div>
        <div class="rounded-xl border px-4 py-3">
          <dt class="text-muted-foreground">1re écoute</dt>
          <dd class="mt-1 text-base font-semibold">
            {{ (s.firstPlayedAt | date: 'd MMM y') ?? '—' }}
          </dd>
        </div>
        <div class="rounded-xl border px-4 py-3">
          <dt class="text-muted-foreground">Dernière écoute</dt>
          <dd class="mt-1 text-base font-semibold">
            {{ (s.lastPlayedAt | date: 'd MMM y') ?? '—' }}
          </dd>
        </div>
        <div class="rounded-xl border px-4 py-3">
          <dt class="text-muted-foreground">Liké le</dt>
          <dd class="mt-1 text-base font-semibold">
            {{ (s.likedAt | date: 'd MMM y') ?? 'Pas liké' }}
          </dd>
        </div>
      </dl>

      @if (s.months.length) {
        <section>
          <h3 class="mb-2 font-medium">Écoutes par mois</h3>
          <app-timeline-chart [months]="s.months" />
        </section>
      } @else {
        <p class="text-muted-foreground">
          Aucune écoute de ce titre dans ton historique importé.
          <a routerLink="/history" class="underline underline-offset-4" (click)="dialogRef.close()"
            >Importe ton historique</a
          >
          s'il manque.
        </p>
      }

      @if (s.playlists.length) {
        <section>
          <h3 class="mb-2 font-medium">
            Dans {{ s.playlists.length }} playlist{{ s.playlists.length > 1 ? 's' : '' }}
          </h3>
          <ul class="flex flex-wrap gap-2">
            @for (playlist of s.playlists; track playlist.id) {
              <li>
                <a
                  class="hover:bg-muted flex items-center gap-2 rounded-md border py-1 ps-1 pe-3"
                  [routerLink]="['/playlists', playlist.id]"
                  (click)="dialogRef.close()"
                >
                  <app-playlist-cover class="size-6 rounded" [playlist]="playlist" />
                  <span class="max-w-48 truncate">{{ playlist.name }}</span>
                </a>
              </li>
            }
          </ul>
        </section>
      }
    } @else {
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
        @for (i of placeholders; track i) {
          <div hlmSkeleton class="h-18 rounded-xl"></div>
        }
      </div>
      <div hlmSkeleton class="h-40 rounded-xl" aria-hidden="true"></div>
      <p class="sr-only" role="status">Chargement de l'historique…</p>
    }
  `,
})
export class TrackStatsDialog {
  protected readonly track = injectBrnDialogContext<StatsTrack>();
  protected readonly dialogRef = inject(BrnDialogRef);

  protected readonly song = inject(StatsApi).song(signal(this.track.id));
  protected readonly failed = signal(false);
  protected readonly placeholders = [0, 1, 2, 3, 4, 5];

  /** « 3 h 12 », ou « 45 min » sous l'heure. */
  protected readonly duration = computed(() => {
    const minutes = Math.round((this.song.value()?.msPlayed ?? 0) / 60_000);
    return minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60).toLocaleString('fr')} h ${String(minutes % 60).padStart(2, '0')}`;
  });

  /** « Le samedi, vers 18 h » : jour et heure les plus écoutés, chacun de son côté. */
  protected readonly moment = computed(() => {
    const s = this.song.value();
    return s?.topWeekday && s.topHour !== null
      ? `Le ${WEEKDAYS[s.topWeekday - 1]}, vers ${s.topHour} h`
      : null;
  });
}
