import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { LIKED_PLAYLIST_ID } from '../../core/models';
import { PlaylistsApi } from '../../core/playlists-api';

/**
 * Bouton « Retirer N titres », avec confirmation : les titres passent par la corbeille et le journal.
 * `done` donne le message à afficher, une fois le retrait terminé ou interrompu.
 */
@Component({
  selector: 'app-remove-tracks',
  imports: [DecimalPipe, HlmAlertDialogImports, HlmButtonImports],
  template: `
    <hlm-alert-dialog>
      <button
        hlmAlertDialogTrigger
        hlmBtn
        size="sm"
        variant="destructive"
        [disabled]="!positions().length || removing()"
      >
        {{ removing() ? 'Retrait en cours…' : 'Retirer ' + (positions().length | number) + ' titres' }}
      </button>
      <hlm-alert-dialog-content *hlmAlertDialogPortal="let ctx">
        <hlm-alert-dialog-header>
          <h2 hlmAlertDialogTitle>Retirer {{ positions().length | number }} titres {{ from() }} ?</h2>
          <p hlmAlertDialogDescription>
            Ils sont d'abord copiés dans ta playlist « Spotylist · Corbeille », et notés dans le journal :
            tu pourras les remettre en place.
          </p>
        </hlm-alert-dialog-header>
        <hlm-alert-dialog-footer>
          <button hlmAlertDialogCancel variant="outline">Annuler</button>
          <button hlmAlertDialogAction variant="destructive" (click)="ctx.close(); remove()">Retirer</button>
        </hlm-alert-dialog-footer>
      </hlm-alert-dialog-content>
    </hlm-alert-dialog>
  `,
})
export class RemoveTracks {
  /** Id Spotify de la playlist, ou `LIKED_PLAYLIST_ID`. */
  readonly playlistId = input.required<string>();
  readonly playlistName = input<string>();
  readonly positions = input.required<number[]>();
  readonly done = output<string>();

  private readonly api = inject(PlaylistsApi);
  protected readonly removing = signal(false);

  protected readonly from = computed(() =>
    this.playlistId() === LIKED_PLAYLIST_ID ? 'de tes likes' : `de « ${this.playlistName() ?? ''} »`,
  );

  protected remove(): void {
    this.removing.set(true);
    this.api.remove(this.playlistId(), this.positions()).subscribe({
      next: ({ removed }) => {
        this.removing.set(false);
        this.done.emit(`${removed} titre${removed > 1 ? 's' : ''} retiré${removed > 1 ? 's' : ''}, et mis dans la corbeille.`);
      },
      error: () => {
        this.removing.set(false);
        this.done.emit("Le retrait s'est interrompu : les titres déjà retirés sont dans la corbeille.");
      },
    });
  }
}
