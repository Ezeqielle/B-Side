import { Component, computed, input } from '@angular/core';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { Me } from './models';

/** Nom affiché d'un compte Spotify, son id à défaut. */
export function accountName(account: Me): string {
  return account.displayName ?? account.id;
}

/** Photo d'un compte Spotify, ou ses initiales. Décorative : le nom est écrit à côté. */
@Component({
  selector: 'app-account-avatar',
  imports: [HlmAvatarImports],
  template: `
    <hlm-avatar>
      @if (account().avatarUrl; as url) {
        <img hlmAvatarImage [src]="url" alt="" />
      }
      <span hlmAvatarFallback aria-hidden="true">{{ initials() }}</span>
    </hlm-avatar>
  `,
})
export class AccountAvatar {
  readonly account = input.required<Me>();

  protected readonly initials = computed(() => accountName(this.account()).slice(0, 2).toUpperCase());
}
