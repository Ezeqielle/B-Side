<?php

namespace App\Tests\Spotify;

use App\Spotify\Model\Track;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class TrackTest extends TestCase
{
    /**
     * @return iterable<string, array{list<array{url: string, width?: ?int}>, ?string}>
     */
    public static function covers(): iterable
    {
        yield 'tailles habituelles' => [[['url' => '640', 'width' => 640], ['url' => '300', 'width' => 300], ['url' => '64', 'width' => 64]], '300'];
        yield 'que des petites' => [[['url' => '64', 'width' => 64]], '64'];
        yield 'tailles inconnues' => [[['url' => 'a', 'width' => null], ['url' => 'b', 'width' => null]], 'a'];
        yield 'sans pochette' => [[], null];
    }

    /**
     * @param list<array{url: string, width?: ?int}> $images
     */
    #[DataProvider('covers')]
    public function testThumbnailIsTheSmallestCoverOfAtLeast300Px(array $images, ?string $expected): void
    {
        $track = Track::fromApi([
            'id' => 'id',
            'uri' => 'spotify:track:id',
            'name' => 'Song',
            'artists' => [['id' => 'artist', 'name' => 'Artist']],
            'album' => ['name' => 'Album', 'images' => $images],
            'duration_ms' => 200000,
        ]);

        self::assertSame($expected, $track->thumbnailUrl);
    }
}
