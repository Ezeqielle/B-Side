import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { SongVersion } from '../../core/models';
import { PlaylistsApi } from '../../core/playlists-api';
import { TrackPreview } from '../../core/track-preview';
import { RemoveTracks } from './remove-tracks';
import { SincePipe } from './since';
import { defaultKept, minutes, removedByDefault } from './version-picks';

/**
 * Versions d'un même morceau dans une playlist (single, album, remix…) : on en garde une par groupe,
 * et les autres sont cochées pour être retirées. Seul le même enregistrement l'est d'office.
 */
@Component({
  selector: 'app-duplicates-page',
  imports: [
    DecimalPipe,
    RouterLink,
    HlmBadgeImports,
    HlmCheckboxImports,
    HlmRadioGroupImports,
    HlmSkeletonImports,
    HlmSwitchImports,
    RemoveTracks,
    SincePipe,
    TrackPreview,
  ],
  template: `
    <a
      [routerLink]="['/playlists', id()]"
      class="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
    >
      ← {{ playlist.value()?.name ?? 'Playlist' }}
    </a>

    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Doublons</h1>
      <p class="text-muted-foreground text-sm">
        Les versions d'un même morceau : single, album, compilation, mais aussi remix ou edit. Choisis
        celle à garder, les autres versions du même enregistrement sont cochées pour être retirées.
      </p>
    </div>

    @if (outcome(); as message) {
      <p class="bg-muted mb-6 rounded-lg px-4 py-3 text-sm" role="status">
        {{ message }} <a routerLink="/journal" class="underline">Voir le journal</a>
      </p>
    }

    @if (versions.error()) {
      <p class="text-destructive" role="alert">Impossible de récupérer les doublons de cette playlist.</p>
    } @else if (versions.value(); as groups) {
      @if (groups.length) {
        <div
          class="bg-background/80 sticky top-14 z-[5] mb-4 flex flex-wrap items-center justify-between gap-3 border-b py-3 backdrop-blur"
        >
          <div class="flex items-center gap-3">
            <hlm-switch inputId="others" [checked]="others()" (checkedChange)="others.set($event)" />
            <label for="others" class="text-sm">Cocher aussi les autres versions (remix, edit…)</label>
          </div>
          <div class="flex items-center gap-3">
            <p class="text-sm" role="status">
              {{ groups.length | number }} morceaux ·
              <strong>{{ selected().length | number }}</strong> titres sélectionnés
            </p>
            <app-remove-tracks
              [playlistId]="id()"
              [playlistName]="playlist.value()?.name"
              [positions]="selected()"
              (done)="removed($event)"
            />
          </div>
        </div>

        <div class="grid gap-3">
          @for (group of groups; track group[0].track.position) {
            @let key = group[0].track.position;
            @let keptVersion = keptOf(group);
            <hlm-radio-group
              class="bg-card gap-0 divide-y rounded-xl border"
              [value]="keptVersion.track.position"
              (valueChange)="keep(key, $event)"
              [attr.aria-label]="'Version à garder de ' + group[0].track.name"
            >
              @for (version of group; track version.track.position) {
                @let track = version.track;
                @let isKept = version === keptVersion;
                <div class="flex items-center gap-3 px-4 py-2" [class.opacity-60]="!isKept && !isRemoved(version, keptVersion)">
                  <hlm-radio [value]="track.position" [aria-label]="'Garder ' + track.name + ', ' + track.albumName">
                    <hlm-radio-indicator indicator />
                  </hlm-radio>
                  <hlm-checkbox
                    [aria-label]="'Retirer ' + track.name + ', ' + track.albumName"
                    [disabled]="isKept"
                    [checked]="isRemoved(version, keptVersion)"
                    (checkedChange)="override(track.position, $event)"
                  />
                  <app-track-preview
                    class="size-9 rounded-md"
                    [trackId]="track.id"
                    [name]="track.name"
                    [imageUrl]="track.imageUrl"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium" [title]="track.name">{{ track.name }}</p>
                    <p class="text-muted-foreground truncate text-xs">
                      {{ track.artistName }} · {{ track.albumName }} · #{{ track.position + 1 }}
                    </p>
                  </div>
                  @if (isKept) {
                    <span hlmBadge>Gardée</span>
                  } @else if (version.recording === keptVersion.recording) {
                    <span hlmBadge variant="secondary">Même enregistrement</span>
                  } @else {
                    <span hlmBadge variant="outline">Autre version</span>
                  }
                  <span class="hidden w-12 text-right text-xs tabular-nums sm:inline">
                    {{ minutes(track.durationMs) }}
                  </span>
                  <span class="text-muted-foreground hidden w-40 text-right text-xs md:inline">
                    {{ track.plays | number }} écoutes · ajouté {{ track.addedAt | since }}
                  </span>
                </div>
              }
            </hlm-radio-group>
          }
        </div>
      } @else {
        <p class="text-muted-foreground">Aucun doublon dans cette playlist.</p>
      }
    } @else {
      <div hlmSkeleton class="h-96 rounded-xl"></div>
    }
  `,
})
export class DuplicatesPage {
  /** Id Spotify, depuis l'URL. */
  readonly id = input.required<string>();

  private readonly api = inject(PlaylistsApi);
  protected readonly playlist = this.api.playlist(this.id);
  protected readonly versions = this.api.versions(this.id);
  private readonly groups = computed(() => this.versions.value() ?? []);

  protected readonly minutes = minutes;
  protected readonly others = signal(false);
  protected readonly outcome = signal<string | null>(null);

  /** Version gardée de chaque groupe (clé : position du premier titre), choisie à la main. */
  private readonly kept = linkedSignal<SongVersion[][], ReadonlyMap<number, number>>({
    source: this.groups,
    computation: () => new Map(),
  });

  /** Cases cochées ou décochées à la main, par position. */
  private readonly overrides = linkedSignal<SongVersion[][], ReadonlyMap<number, boolean>>({
    source: this.groups,
    computation: () => new Map(),
  });

  protected readonly selected = computed(() =>
    this.groups().flatMap((group) => {
      const kept = this.keptOf(group);
      return group
        .filter((version) => this.isRemoved(version, kept))
        .map((version) => version.track.position);
    }),
  );

  protected keptOf(group: SongVersion[]): SongVersion {
    const position = this.kept().get(group[0].track.position) ?? defaultKept(group);
    return group.find((version) => version.track.position === position) ?? group[0];
  }

  protected isRemoved(version: SongVersion, kept: SongVersion): boolean {
    return (
      version !== kept &&
      (this.overrides().get(version.track.position) ?? removedByDefault(version, kept, this.others()))
    );
  }

  protected keep(key: number, position: number): void {
    this.kept.update((kept) => new Map(kept).set(key, position));
    // La nouvelle version gardée ne peut pas rester cochée
    this.overrides.update((overrides) => {
      const next = new Map(overrides);
      next.delete(position);
      return next;
    });
  }

  protected override(position: number, removed: boolean): void {
    this.overrides.update((overrides) => new Map(overrides).set(position, removed));
  }

  protected removed(message: string): void {
    this.outcome.set(message);
    this.playlist.reload();
    this.versions.reload();
  }
}
