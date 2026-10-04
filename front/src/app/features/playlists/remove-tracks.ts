import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { LIKED_PLAYLIST_ID } from '../../core/models';
import { Removal } from './removal';

/** Bouton « Retirer N titres », avec confirmation : les titres passent par la corbeille et le journal. */
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
        [disabled]="!removal().count() || removal().locked()"
      >
        {{ removal().removing() ? 'Retrait en cours…' : 'Retirer ' + (removal().count() | number) + ' titres' }}
      </button>
      <hlm-alert-dialog-content *hlmAlertDialogPortal="let ctx">
        <hlm-alert-dialog-header>
          <h2 hlmAlertDialogTitle>Retirer {{ removal().count() | number }} titres {{ from() }} ?</h2>
          <p hlmAlertDialogDescription>
            @if (removal().targets().length > 1) {
              {{ names() }}.
            }
            Ils sont d'abord copiés dans ta playlist « Spotylist · Corbeille », et notés dans le journal :
            tu pourras les remettre en place.
          </p>
        </hlm-alert-dialog-header>
        <hlm-alert-dialog-footer>
          <button hlmAlertDialogCancel variant="outline">Annuler</button>
          <button hlmAlertDialogAction variant="destructive" (click)="ctx.close(); removal().remove()">
            Retirer
          </button>
        </hlm-alert-dialog-footer>
      </hlm-alert-dialog-content>
    </hlm-alert-dialog>
  `,
})
export class RemoveTracks {
  readonly removal = input.required<Removal>();

  protected readonly from = computed(() => {
    const targets = this.removal().targets();
    if (targets.length > 1) {
      return `de ${targets.length} playlists`;
    }
    return targets[0]?.id === LIKED_PLAYLIST_ID ? 'de tes likes' : `de « ${targets[0]?.name ?? ''} »`;
  });

  protected readonly names = computed(() =>
    this.removal()
      .targets()
      .map((target) => `« ${target.name} »`)
      .join(', '),
  );
}

/** Message du dernier retrait, avec le lien vers le journal. */
@Component({
  selector: 'app-removal-outcome',
  imports: [RouterLink],
  template: `
    @if (removal().outcome(); as message) {
      <p class="bg-muted mb-6 rounded-lg px-4 py-3 text-sm" role="status">
        {{ message }} <a routerLink="/journal" class="underline">Voir le journal</a>
      </p>
    }
  `,
})
export class RemovalOutcome {
  readonly removal = input.required<Removal>();
}
