import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { firstValueFrom } from 'rxjs';
import { HistorySummary } from '../../core/models';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe, DecimalPipe, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  template: `
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Ton historique d'écoute</h1>
      <p class="text-muted-foreground text-sm">Toutes tes écoutes depuis la création de ton compte, pour des stats plus fines que les tops de Spotify.</p>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <section hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle>Importer</h2>
          <p hlmCardDescription>
            Demande ton « historique de streaming étendu » sur
            <a class="underline" href="https://www.spotify.com/account/privacy/" target="_blank" rel="noopener">spotify.com/account/privacy</a>
            (livré sous 30 jours), dézippe-le, puis sélectionne les fichiers <code>Streaming_History_*.json</code>.
          </p>
        </div>
        <div hlmCardContent class="flex flex-col items-start gap-3">
          <input #picker type="file" accept=".json,application/json" multiple hidden (change)="upload(picker)" />
          <button hlmBtn [disabled]="!!progress()" (click)="picker.click()">Choisir les fichiers</button>
          <p class="text-muted-foreground text-sm" role="status">
            @if (progress(); as p) {
              Envoi {{ p.done + 1 }} / {{ p.total }}…
            } @else {
              Tu peux renvoyer un fichier déjà importé : les doublons sont ignorés.
            }
          </p>
          @if (rejected().length) {
            <p class="text-destructive text-sm" role="alert">
              Non importés : {{ rejected().join(', ') }}. Seuls les fichiers de l'historique étendu sont acceptés.
            </p>
          }
        </div>
      </section>

      <section hlmCard>
        <div hlmCardHeader>
          <h2 hlmCardTitle>Déjà importé</h2>
          <p hlmCardDescription>L'enregistrement continue en arrière-plan après l'envoi.</p>
        </div>
        <div hlmCardContent>
          @if (summary.error()) {
            <p class="text-destructive text-sm" role="alert">Impossible de récupérer ton historique pour le moment.</p>
          } @else if (summary.value(); as s) {
            @if (s.plays) {
              <p class="text-3xl font-bold tabular-nums">{{ s.plays | number }} <span class="text-base font-normal">écoutes</span></p>
              <p class="text-muted-foreground text-sm">
                {{ s.tracks | number }} titres, de {{ s.firstPlayedAt | date: 'yyyy' }} à {{ s.lastPlayedAt | date: 'yyyy' }}
              </p>
            } @else {
              <p class="text-muted-foreground text-sm">Rien pour l'instant.</p>
            }
          } @else {
            <div hlmSkeleton class="h-9 w-40"></div>
            <div hlmSkeleton class="mt-2 h-4 w-56"></div>
          }
        </div>
        <div hlmCardFooter>
          <button hlmBtn variant="outline" size="sm" (click)="summary.reload()">Actualiser</button>
        </div>
      </section>
    </div>
  `,
})
export class HistoryPage {
  private readonly http = inject(HttpClient);

  protected readonly summary = httpResource<HistorySummary>(() => '/api/history');
  protected readonly progress = signal<{ done: number; total: number } | null>(null);
  protected readonly rejected = signal<string[]>([]);

  /** Un fichier par requête : chacun fait jusqu'à ~12 Mo. */
  protected async upload(picker: HTMLInputElement): Promise<void> {
    const files = Array.from(picker.files ?? []);
    picker.value = '';
    this.rejected.set([]);

    for (const [done, file] of files.entries()) {
      this.progress.set({ done, total: files.length });
      const body = new FormData();
      body.append('file', file);
      try {
        await firstValueFrom(this.http.post('/api/history', body));
      } catch {
        this.rejected.update((names) => [...names, file.name]);
      }
      this.summary.reload();
    }

    this.progress.set(null);
  }
}
