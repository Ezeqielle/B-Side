import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlaylistsApi } from '../../core/playlists-api';
import { RemovalTarget, removal } from './removal';

/** Fausse API : chaque retrait demandé attend sa réponse, donnée à la main. */
function setup(targets: RemovalTarget[]) {
  const calls: { id: string; positions: number[]; response: Subject<{ removed: number }> }[] = [];
  TestBed.configureTestingModule({
    providers: [
      {
        provide: PlaylistsApi,
        useValue: {
          remove: (id: string, positions: number[]) => {
            const response = new Subject<{ removed: number }>();
            calls.push({ id, positions, response });
            return response;
          },
        },
      },
    ],
  });
  const source = { pending: signal(false), reloads: 0, reload: () => source.reloads++ };
  const list = TestBed.runInInjectionContext(() => removal({ targets: () => targets, sources: [source] }));
  const respond = (removed: number) => {
    const { response } = calls[calls.length - 1];
    response.next({ removed });
    response.complete();
  };
  return { list, source, calls, respond };
}

const A = { id: 'a', name: 'A', positions: [0, 3] };
const B = { id: 'b', name: 'B', positions: [5] };

describe('removal', () => {
  it('compte les titres de toutes les playlists', () => {
    expect(setup([A, B]).list.count()).toBe(3);
  });

  it("retire d'une playlist après l'autre, puis relit les sources", () => {
    const { list, source, calls, respond } = setup([A, B]);
    list.remove();
    expect(calls.map((call) => call.id)).toEqual(['a']);
    expect(list.locked()).toBe(true);

    respond(2);
    expect(calls.map((call) => call.id)).toEqual(['a', 'b']);
    expect(source.reloads).toBe(0);

    respond(1);
    expect(source.reloads).toBe(1);
    expect(list.outcome()).toBe('3 titres retirés, et mis dans la corbeille.');
  });

  it("reste verrouillé jusqu'à ce que les sources soient relues", () => {
    const { list, source, respond } = setup([A]);
    list.remove();
    source.pending.set(true);
    respond(2);
    expect(list.removing()).toBe(false);
    expect(list.locked()).toBe(true);

    source.pending.set(false);
    expect(list.locked()).toBe(false);
  });

  it("s'arrête à la première erreur", () => {
    const { list, source, calls } = setup([A, B]);
    list.remove();
    calls[0].response.error(new Error());

    expect(calls).toHaveLength(1);
    expect(source.reloads).toBe(1);
    expect(list.outcome()).toBe("Le retrait s'est interrompu : les titres déjà retirés sont dans la corbeille.");
  });
});
