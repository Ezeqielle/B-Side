import { DecimalPipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PlaylistsApi } from '../../core/playlists-api';

/** Playlist créée sur Spotify. */
export interface CreatedPlaylist {
  id: string;
  name: string;
}

/**
 * Bouton « Créer playlist » : demande un nom, puis crée une playlist privée avec les titres, dans l'ordre.
 * `done` donne la playlist créée, ou `null` si la création a échoué.
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
  template: `
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
  readonly defaultName = input.required<string>();
  readonly done = output<CreatedPlaylist | null>();

  private readonly api = inject(PlaylistsApi);
  protected readonly model = signal({ name: '' });
  protected readonly playlistForm = form(this.model, (playlist) => {
    required(playlist.name);
    pattern(playlist.name, /\S/);
    maxLength(playlist.name, 100);
  });
  protected readonly creating = signal(false);

  protected create(): void {
    const name = this.model().name.trim();
    this.creating.set(true);
    this.api.create(name, this.trackIds()).subscribe({
      next: ({ id }) => {
        this.creating.set(false);
        this.done.emit({ id, name });
      },
      error: () => {
        this.creating.set(false);
        this.done.emit(null);
      },
    });
  }
}
