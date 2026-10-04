import { DecimalPipe, formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PlaylistsApi } from './playlists-api';

/** Playlist créée sur Spotify. */
interface CreatedPlaylist {
  id: string;
  name: string;
}

/**
 * Bouton « Créer playlist » : demande un nom, puis crée une playlist privée avec les titres, dans l'ordre.
 * Affiche à côté le lien vers la playlist créée, ou l'échec, jusqu'à ce que les titres changent.
 */
@Component({
  selector: 'app-create-playlist',
  imports: [
    DecimalPipe,
    FormField,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  host: { class: 'inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1' },
  template: `
    <span class="text-sm" role="status">
      @if (created(); as playlist) {
        Playlist créée :
        <a
          class="underline underline-offset-4"
          target="_blank"
          rel="noopener"
          [href]="'https://open.spotify.com/playlist/' + playlist.id"
          >ouvrir « {{ playlist.name }} » dans Spotify</a
        >
      } @else if (created() === null) {
        <span class="text-destructive">La création de la playlist s'est interrompue.</span>
      }
    </span>
    <hlm-dialog>
      <button
        hlmDialogTrigger
        hlmBtn
        variant="outline"
        [disabled]="!trackIds().length || creating()"
        (click)="model.set({ name: defaultName() })"
      >
        {{ creating() ? 'Création…' : 'Créer playlist' }}
      </button>
      <hlm-dialog-content *hlmDialogPortal="let ctx" class="sm:max-w-md">
        <form class="grid gap-4" (submit)="$event.preventDefault(); ctx.close(); create()">
          <hlm-dialog-header>
            <h2 hlmDialogTitle>Créer une playlist de {{ trackIds().length | number }} titres</h2>
            <p hlmDialogDescription>
              Playlist privée sur ton compte Spotify, dans l'ordre du classement.
            </p>
          </hlm-dialog-header>
          <div class="grid gap-2">
            <label hlmLabel for="playlist-name">Nom</label>
            <input hlmInput id="playlist-name" autocomplete="off" [formField]="playlistForm.name" />
          </div>
          <hlm-dialog-footer>
            <button hlmBtn type="button" variant="outline" (click)="ctx.close()">Annuler</button>
            <button hlmBtn type="submit" [disabled]="playlistForm().invalid()">Créer</button>
          </hlm-dialog-footer>
        </form>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class CreatePlaylist {
  /** Ids Spotify, dans l'ordre de la playlist. */
  readonly trackIds = input.required<string[]>();
  /** Début du nom proposé, suivi de la date : « Top 4 semaines · 3 oct. 2026 ». */
  readonly namePrefix = input.required<string>();

  private readonly api = inject(PlaylistsApi);
  private readonly locale = inject(LOCALE_ID);
  protected readonly defaultName = computed(
    () => `${this.namePrefix()} · ${formatDate(Date.now(), 'd MMM y', this.locale)}`,
  );
  protected readonly model = signal({ name: '' });
  protected readonly playlistForm = form(this.model, (playlist) => {
    required(playlist.name);
    pattern(playlist.name, /\S/);
    maxLength(playlist.name, 100);
  });
  protected readonly creating = signal(false);
  /** Dernière playlist créée, `null` si la création a échoué. Oubliée quand les titres changent. */
  protected readonly created = linkedSignal<string, CreatedPlaylist | null | undefined>({
    source: () => this.trackIds().join(),
    computation: () => undefined,
  });

  protected create(): void {
    const name = this.model().name.trim();
    this.creating.set(true);
    this.api.create(name, this.trackIds()).subscribe({
      next: ({ id }) => {
        this.creating.set(false);
        this.created.set({ id, name });
      },
      error: () => {
        this.creating.set(false);
        this.created.set(null);
      },
    });
  }
}
