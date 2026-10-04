import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlaylistsApi, RemovalResult } from '../../core/playlists-api';
import { RemovalTarget, removal } from './removal';

/** Fausse API : le retrait attend sa réponse, donnée à la main. */
function setup(targets: RemovalTarget[]) {
  const calls: { targets: unknown; response: Subject<RemovalResult> }[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: PlaylistsApi,
        useValue: {
          remove: (targets: unknown) => {
            const response = new Subject<RemovalResult>();
            calls.push({ targets, response });
            return response;
          },
        },
      },
    ],
  });
  const source = { pending: signal(false), reloads: 0, reload: () => source.reloads++ };
  const list = TestBed.runInInjectionContext(() => removal({ targets: () => targets, sources: [source] }));
  const respond = (result: RemovalResult) => {
    calls[0].response.next(result);
    calls[0].response.complete();
  };
  return { list, source, calls, respond };
}

const A = { id: 'a', name: 'A', tracks: [{ position: 0, id: 'x' }, { position: 3, id: 'y' }] };
const B = { id: 'b', name: 'B', tracks: [{ position: 5, id: 'x' }] };

describe('removal', () => {
  it('compte les titres de toutes les playlists', () => {
    expect(setup([A, B]).list.count()).toBe(3);
  });

  it('retire de toutes les playlists en une requête, puis relit les sources', () => {
    const { list, source, calls, respond } = setup([A, B]);
    list.remove();
    expect(calls.map((call) => call.targets)).toEqual([
      [
        { playlistId: 'a', tracks: A.tracks },
        { playlistId: 'b', tracks: B.tracks },
      ],
    ]);
    expect(list.locked()).toBe(true);

    respond({ removed: 3, skipped: 0 });
    expect(source.reloads).toBe(1);
    expect(list.outcome()).toBe('3 titres retirés, et mis dans la corbeille.');
  });

  it('signale les titres qui avaient bougé', () => {
    const { list, respond } = setup([A, B]);
    list.remove();
    respond({ removed: 2, skipped: 1 });
    expect(list.outcome()).toBe(
      "2 titres retirés, et mis dans la corbeille. 1 titre avait bougé depuis l'affichage : laissé en place.",
    );
  });

  it("reste verrouillé jusqu'à ce que les sources soient relues", () => {
    const { list, source, respond } = setup([A]);
    list.remove();
    source.pending.set(true);
    respond({ removed: 2, skipped: 0 });
    expect(list.removing()).toBe(false);
    expect(list.locked()).toBe(true);

    source.pending.set(false);
    expect(list.locked()).toBe(false);
  });

  it("relit les sources après une erreur, avec le message d'interruption", () => {
    const { list, source, calls } = setup([A, B]);
    list.remove();
    calls[0].response.error(new Error());

    expect(source.reloads).toBe(1);
    expect(list.outcome()).toBe("Le retrait s'est interrompu : les titres déjà retirés sont dans la corbeille.");
  });
});
