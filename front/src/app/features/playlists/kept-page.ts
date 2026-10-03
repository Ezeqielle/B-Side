import { DecimalPipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { PlaylistsApi } from '../../core/playlists-api';
import { TrackPreview } from '../../core/track-preview';
import { SincePipe } from './since';

/**
 * Titres à garder d'une playlist : décochés au nettoyage, quelles que soient les règles.
 * On les y ajoute en les décochant, on les rend au nettoyage ici.
 */
@Component({
  selector: 'app-kept-page',
  imports: [DecimalPipe, RouterLink, HlmButtonImports, HlmSkeletonImports, SincePipe, TrackPreview],
  template: `
    <a
      [routerLink]="['/playlists', id()]"
      class="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
    >
      ← {{ playlist.value()?.name ?? 'Playlist' }}
    </a>

    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Titres à garder</h1>
      <p class="text-muted-foreground text-sm">
        Les titres décochés pendant un nettoyage : ils restent décochés aux nettoyages suivants, quelles que soient
        les règles. « Ne plus garder » les rend au nettoyage.
      </p>
    </div>

    @if (kept.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer les titres à garder.</p>
    } @else if (kept.value(); as tracks) {
      @if (tracks.length) {
        <p class="mb-3 text-sm" role="status">{{ tracks.length | number }} titres à garder</p>
        <ul class="bg-card divide-y rounded-xl border">
          @for (track of tracks; track track.id) {
            <li class="flex items-center gap-3 px-4 py-2">
              <app-track-preview class="size-9 rounded-md" [trackId]="track.id" [name]="track.name" [imageUrl]="track.imageUrl" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium" [title]="track.name">{{ track.name }}</p>
                <p class="text-muted-foreground truncate text-xs">{{ track.artistName }}</p>
              </div>
              <span class="text-muted-foreground hidden text-xs whitespace-nowrap sm:inline">
                gardé {{ track.keptAt | since }}
              </span>
              <button
                hlmBtn
                size="xs"
                variant="ghost"
                [disabled]="releasing().has(track.id)"
                [attr.aria-label]="'Ne plus garder ' + track.name"
                (click)="release(track.id)"
              >
                Ne plus garder
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="text-muted-foreground">
          Aucun titre à garder : décoche un titre pendant un nettoyage pour qu'il le reste.
        </p>
      }
    } @else {
      <div hlmSkeleton class="h-96 rounded-xl"></div>
    }
  `,
})
export class KeptPage {
  /** Id Spotify, depuis l'URL. */
  readonly id = input.required<string>();

  private readonly api = inject(PlaylistsApi);
  protected readonly playlist = this.api.playlist(this.id);
  protected readonly kept = this.api.kept(this.id);

  /** Titres en cours d'envoi, le temps que la liste soit relue. */
  protected readonly releasing = signal<ReadonlySet<string>>(new Set());

  protected release(trackId: string): void {
    this.releasing.update((set) => new Set(set).add(trackId));
    this.api.keep(this.id(), [trackId], false).subscribe({
      complete: () => this.kept.reload(),
      error: () =>
        this.releasing.update((set) => {
          const next = new Set(set);
          next.delete(trackId);
          return next;
        }),
    });
  }
}
