<?php

namespace App\Tests\Playlist;

use App\Playlist\PlaylistTrackStat;
use App\Playlist\SongVersion;
use App\Playlist\SongVersions;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Cas tirés de vraies playlists.
 */
class SongVersionsTest extends TestCase
{
    /**
     * @return iterable<string, array{0: array{string, string, int}, 1: array{string, string, int}, 2: bool, 3: bool}>
     */
    public static function pairs(): iterable
    {
        // [titre, artiste, durée en s], même morceau, même enregistrement
        yield 'album et single' => [['Body Back (feat. Maia Wright)', 'Gryffin', 214546], ['Body Back (feat. Maia Wright)', 'Gryffin', 214634], true, true];
        yield 'feat. en plus' => [['Entwined', 'Lane 8', 220689], ['Entwined (feat. Grimes)', 'Lane 8', 220689], true, true];
        yield 'radio edit de même durée' => [['Wake Me Up', 'Avicii', 247426], ['Wake Me Up - Radio Edit', 'Avicii', 247426], true, true];
        yield 'original mix' => [['Generic', 'Artist', 213750], ['Generic - Original Mix', 'Artist', 213750], true, true];
        yield 'remaster' => [['Let It Be', 'The Beatles', 243000], ['Let It Be - Remastered 2009', 'The Beatles', 243500], true, true];
        yield 'apostrophe typographique' => [['Let’s Get Married (feat. Offset)', 'Jungle', 233600], ["Let's Get Married", 'Jungle', 233786], true, true];
        yield 'collaboration rangée sous un autre artiste' => [['Feel Good (with Daya)', 'Gryffin', 248000], ['Feel Good', 'ILLENIUM', 248300], true, true];
        yield 'remix' => [['Something Just Like This', 'The Chainsmokers', 247626], ['Something Just Like This - Don Diablo Remix', 'The Chainsmokers', 230853], true, false];
        yield 'instrumental de même durée' => [['Carry You', 'Ruelle', 215905], ['Carry You - Instrumental Mix', 'Ruelle', 215905], true, false];
        yield 'même nom, durée différente' => [['Nightcall', 'Kavinsky', 179306], ['Nightcall', 'Kavinsky', 258413], true, false];
        yield 'homonymes' => [['Believe', 'CamelPhat', 213000], ['Believe', 'Don Diablo', 217000], false, false];
    }

    /**
     * @param array{string, string, int} $a
     * @param array{string, string, int} $b
     */
    #[DataProvider('pairs')]
    public function testPairs(array $a, array $b, bool $sameSong, bool $sameRecording): void
    {
        $groups = SongVersions::group([self::track(0, ...$a), self::track(1, ...$b)]);

        self::assertCount($sameSong ? 1 : 0, $groups);
        if ($sameSong) {
            self::assertSame($sameRecording, $groups[0][0]->recording === $groups[0][1]->recording);
        }
    }

    public function testGroupsFollowThePlaylist(): void
    {
        $groups = SongVersions::group([
            self::track(0, 'Animals - Jay Ronko Remix', 'Martin Garrix', 253090),
            self::track(1, 'Wake Me Up', 'Avicii', 247426),
            self::track(2, 'Solo', 'Artist', 200000),
            self::track(3, 'Animals', 'Martin Garrix', 304228),
            self::track(4, 'Wake Me Up - Radio Edit', 'Avicii', 247426),
            self::track(5, 'Animals - Original Mix', 'Martin Garrix', 304228),
        ]);

        self::assertSame([[0, 3, 5], [1, 4]], array_map(
            static fn (array $group): array => array_map(static fn (SongVersion $version): int => $version->track->position, $group),
            $groups,
        ));
        self::assertSame([0, 3, 3], array_column($groups[0], 'recording'), 'Animals et son Original Mix : même enregistrement, repéré par le premier');
    }

    private static function track(int $position, string $name, string $artist, int $durationMs): PlaylistTrackStat
    {
        return new PlaylistTrackStat($position, 'id' . $position, $name, $artist, 'Album', $durationMs, null, null, 0, 0, 0.0, null);
    }
}
