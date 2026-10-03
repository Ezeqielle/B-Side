<?php

namespace App\Tests\History;

use App\History\InvalidStreamingHistoryException;
use App\History\StreamedPlay;
use App\History\StreamingHistoryParser;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class StreamingHistoryParserTest extends TestCase
{
    public function testKeepsTracksAndSkipsPodcasts(): void
    {
        $plays = new StreamingHistoryParser()->parse((string) file_get_contents(__DIR__ . '/../fixtures/Streaming_History_Audio_2020-2021.json'));

        self::assertCount(4, $plays);
        self::assertEquals(new StreamedPlay(
            trackId: '7ouMYWpwJ422jRcDASZB7P',
            trackName: 'Song B',
            artistName: 'Artist B',
            albumName: 'Album B',
            playedAt: new \DateTimeImmutable('2020-03-01T10:03:30Z'),
            msPlayed: 12000,
            skipped: true,
            reasonStart: 'clickrow',
            reasonEnd: 'fwdbtn',
        ), $plays[1]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function invalidFiles(): iterable
    {
        yield 'not JSON' => ['<html>'];
        yield 'not a list' => ['{"ts": "2020-03-01T10:00:00Z"}'];
        yield 'basic history' => ['[{"endTime": "2020-03-01 10:00", "artistName": "A", "trackName": "B", "msPlayed": 1000}]'];
    }

    #[DataProvider('invalidFiles')]
    public function testRejectsAnythingElse(string $json): void
    {
        $this->expectException(InvalidStreamingHistoryException::class);

        new StreamingHistoryParser()->parse($json);
    }
}
