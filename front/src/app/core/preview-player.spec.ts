import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreviewPlayer } from './preview-player';
import { PreviewDirective } from './preview.directive';

@Component({
  imports: [PreviewDirective],
  template: `<div [appPreview]="trackId()"></div>`,
})
class Host {
  readonly trackId = signal('A');
}

describe('PreviewPlayer', () => {
  let player: PreviewPlayer;
  let audio: { src: string; paused: boolean };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      audio = this as unknown as typeof audio;
      Object.defineProperty(this, 'paused', { value: false, configurable: true });
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      Object.defineProperty(this, 'paused', { value: true, configurable: true });
    });
    localStorage.clear();
    player = TestBed.inject(PreviewPlayer);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const click = () => document.dispatchEvent(new PointerEvent('pointerdown'));

  it('ne joue rien avant la première interaction avec la page', async () => {
    player.play('A');
    await vi.runAllTimersAsync();

    expect(player.playing()).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('joue un seul extrait à la fois, sur le même lecteur', async () => {
    click();
    player.play('A');
    await vi.runAllTimersAsync();
    const first = audio;

    player.play('B');
    await vi.runAllTimersAsync();

    expect(player.playing()).toBe('B');
    expect(audio).toBe(first);
    expect(audio.src).toMatch(/\/api\/preview\/track\/B$/);
  });

  it("s'arrête après un fondu de sortie", async () => {
    click();
    player.play('A');
    await vi.runAllTimersAsync();

    player.stop();
    expect(player.playing()).toBeNull();
    expect(audio.paused).toBe(false);

    await vi.runAllTimersAsync();
    expect(audio.paused).toBe(true);
  });

  it('retient un titre sans extrait et ne le redemande plus', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException('', 'NotSupportedError'),
    );
    click();
    player.play('A');
    await vi.runAllTimersAsync();

    expect(player.playing()).toBeNull();
    expect(player.state('A')).toBe('unavailable');

    player.play('A');
    await vi.runAllTimersAsync();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it('se coupe et retient le choix', async () => {
    click();
    player.toggle();
    player.play('A');
    await vi.runAllTimersAsync();

    expect(player.playing()).toBeNull();
    expect(localStorage.getItem('previews-enabled')).toBe('false');
  });

  it('joue au survol prolongé et arrête au départ de la souris', async () => {
    click();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('div');

    el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await vi.advanceTimersByTimeAsync(100);
    expect(player.playing()).toBeNull();

    await vi.advanceTimersByTimeAsync(300);
    expect(player.playing()).toBe('A');

    el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(player.playing()).toBeNull();
  });

  it("garde l'extrait d'une popup malgré le départ de la souris, jusqu'à sa fermeture", async () => {
    click();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('div');

    player.hold('A');
    await vi.advanceTimersByTimeAsync(0);
    expect(player.playing()).toBe('A');

    el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(player.playing()).toBe('A');

    player.release(true);
    expect(player.playing()).toBe('A');
    player.hold('A');
    player.release();
    expect(player.playing()).toBeNull();
  });

  it('ignore le toucher', async () => {
    click();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('div')
      .dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    await vi.runAllTimersAsync();

    expect(player.playing()).toBeNull();
  });
});
