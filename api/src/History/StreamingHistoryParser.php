<?php

namespace App\History;

/**
 * Lit un fichier de l'historique d'écoute étendu (Streaming_History_*.json)
 * et n'en garde que les titres : podcasts et livres audio sont ignorés.
 *
 * Seules les données utiles aux stats sont conservées (pas d'IP, de pays ni d'appareil).
 */
final class StreamingHistoryParser
{
    private const string TRACK_URI_PREFIX = 'spotify:track:';

    /**
     * @return list<StreamedPlay>
     *
     * @throws InvalidStreamingHistoryException
     */
    public function parse(string $json): array
    {
        try {
            $entries = json_decode($json, true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new InvalidStreamingHistoryException('Invalid JSON.', previous: $e);
        }

        if (!\is_array($entries) || !array_is_list($entries)) {
            throw new InvalidStreamingHistoryException('Expected a list of plays.');
        }

        $plays = [];
        foreach ($entries as $entry) {
            // L'historique simple (StreamingHistory_music_*.json) n'a ni ts ni URI de titre
            if (!\is_array($entry) || !isset($entry['ts'], $entry['ms_played']) || !\array_key_exists('spotify_track_uri', $entry)) {
                throw new InvalidStreamingHistoryException('Not an extended streaming history.');
            }

            $uri = $entry['spotify_track_uri'];
            if (!\is_string($uri) || !str_starts_with($uri, self::TRACK_URI_PREFIX)) {
                continue;
            }

            $plays[] = new StreamedPlay(
                trackId: substr($uri, \strlen(self::TRACK_URI_PREFIX)),
                trackName: $entry['master_metadata_track_name'] ?? '',
                artistName: $entry['master_metadata_album_artist_name'] ?? '',
                albumName: $entry['master_metadata_album_album_name'] ?? '',
                playedAt: new \DateTimeImmutable($entry['ts']),
                msPlayed: $entry['ms_played'],
                skipped: $entry['skipped'] ?? false,
                reasonStart: $entry['reason_start'] ?? '',
                reasonEnd: $entry['reason_end'] ?? '',
            );
        }

        return $plays;
    }
}
