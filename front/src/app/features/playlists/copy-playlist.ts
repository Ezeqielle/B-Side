import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormField, form, maxLength, pattern, required } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { accountName } from '../../core/account-avatar';
import { AccountsApi } from '../../core/accounts-api';
import { LinkedAccount } from '../../core/models';
import { PlaylistsApi } from '../../core/playlists-api';

/**
 * Bouton « Copier vers… » : copie la playlist sur un compte lié, sous le nom choisi.
 * Absent tant qu'aucun compte n'est lié. Affiche à côté le compte où elle a été copiée, ou l'échec.
 */
@Component({
  selector: 'app-copy-playlist',
  imports: [
    FormField,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmRadioGroupImports,
  ],
  host: { class: 'inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1' },
  template: `
    @if (accounts().length) {
      <span class="text-sm" role="status">
        @if (copiedTo(); as account) {
          Copiée sur {{ accountName(account) }}.
        } @else if (copiedTo() === null) {
          <span class="text-destructive">La copie s'est interrompue.</span>
        }
      </span>
      <hlm-dialog>
        <button
          hlmDialogTrigger
          hlmBtn
          size="xs"
          variant="outline"
          [disabled]="copying()"
          (click)="model.set({ name: name(), accountId: accounts()[0].id })"
        >
          {{ copying() ? 'Copie…' : 'Copier vers…' }}
        </button>
        <hlm-dialog-content *hlmDialogPortal="let ctx" class="sm:max-w-md">
          <form class="grid gap-4" (submit)="$event.preventDefault(); ctx.close(); copy()">
            <hlm-dialog-header>
              <h2 hlmDialogTitle>Copier « {{ name() }} »</h2>
              <p hlmDialogDescription>
                @if (accounts().length === 1) {
                  Playlist privée sur {{ accountName(accounts()[0]) }}, avec les mêmes titres dans le même ordre.
                } @else {
                  Playlist privée sur le compte choisi, avec les mêmes titres dans le même ordre.
                }
              </p>
            </hlm-dialog-header>
            @if (accounts().length > 1) {
              <hlm-radio-group
                class="gap-2"
                aria-label="Compte"
                [value]="model().accountId"
                (valueChange)="selectAccount($event)"
              >
                @for (account of accounts(); track account.id) {
                  <label class="flex items-center gap-2 text-sm">
                    <hlm-radio [value]="account.id">
                      <hlm-radio-indicator indicator />
                    </hlm-radio>
                    {{ accountName(account) }}
                  </label>
                }
              </hlm-radio-group>
            }
            <div class="grid gap-2">
              <label hlmLabel for="copy-name">Nom</label>
              <input hlmInput id="copy-name" autocomplete="off" [formField]="copyForm.name" />
            </div>
            <hlm-dialog-footer>
              <button hlmBtn type="button" variant="outline" (click)="ctx.close()">Annuler</button>
              <button hlmBtn type="submit" [disabled]="copyForm().invalid()">Copier</button>
            </hlm-dialog-footer>
          </form>
        </hlm-dialog-content>
      </hlm-dialog>
    }
  `,
})
export class CopyPlaylist {
  /** Id Spotify, ou `LIKED_PLAYLIST_ID`. */
  readonly playlistId = input.required<string>();
  /** Nom de la playlist, proposé pour la copie. */
  readonly name = input.required<string>();

  private readonly api = inject(PlaylistsApi);
  private readonly linked = inject(AccountsApi).list();
  protected readonly accounts = computed(() => this.linked.value() ?? []);

  protected readonly model = signal({ name: '', accountId: '' });
  protected readonly copyForm = form(this.model, (copy) => {
    required(copy.name);
    pattern(copy.name, /\S/);
    maxLength(copy.name, 100);
  });
  protected readonly copying = signal(false);
  /** Compte de la dernière copie, `null` si elle a échoué. Oublié en changeant de playlist. */
  protected readonly copiedTo = linkedSignal<string, LinkedAccount | null | undefined>({
    source: () => this.playlistId(),
    computation: () => undefined,
  });

  protected readonly accountName = accountName;

  protected selectAccount(accountId: string | null | undefined): void {
    if (accountId) {
      this.model.update((copy) => ({ ...copy, accountId }));
    }
  }

  protected copy(): void {
    const { name, accountId } = this.model();
    const account = this.accounts().find((a) => a.id === accountId);
    if (!account) {
      return;
    }
    this.copying.set(true);
    this.api.copy(this.playlistId(), account.id, name.trim()).subscribe({
      next: () => {
        this.copying.set(false);
        this.copiedTo.set(account);
      },
      error: () => {
        this.copying.set(false);
        this.copiedTo.set(null);
      },
    });
  }
}
