<?php

namespace App\Repository;

use App\Entity\Track;
use App\History\StreamedPlay;
use App\Spotify\Model\Track as SpotifyTrack;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Track>
 */
class TrackRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Track::class);
    }

    /**
     * Ajoute en une requête les titres de ces écoutes qui ne sont pas encore connus.
     *
     * @param list<StreamedPlay> $plays
     */
    public function insertMissing(array $plays): void
    {
        $tracks = [];
        foreach ($plays as $play) {
            $tracks[$play->trackId] = [
                'id' => $play->trackId,
                'name' => $play->trackName,
                'artist_name' => $play->artistName,
                'album_name' => $play->albumName,
            ];
        }

        $this->getEntityManager()->getConnection()->executeStatement(<<<'SQL'
            INSERT INTO track (id, name, artist_name, album_name)
            SELECT * FROM json_to_recordset(:tracks) AS t(id varchar, name text, artist_name text, album_name text)
            ON CONFLICT DO NOTHING
            SQL, ['tracks' => json_encode(array_values($tracks), \JSON_THROW_ON_ERROR)]);
    }

    /**
     * Ajoute en une requête les titres inconnus, et complète la durée et la pochette de ceux déjà connus.
     *
     * @param list<SpotifyTrack> $spotifyTracks
     */
    public function saveFromSpotify(array $spotifyTracks): void
    {
        $tracks = [];
        foreach ($spotifyTracks as $track) {
            $tracks[$track->id] = [
                'id' => $track->id,
                'name' => $track->name,
                'artist_name' => $track->albumArtist,
                'album_name' => $track->album,
                'duration_ms' => $track->durationMs,
                'image_url' => $track->thumbnailUrl,
            ];
        }

        $this->getEntityManager()->getConnection()->executeStatement(<<<'SQL'
            INSERT INTO track (id, name, artist_name, album_name, duration_ms, image_url)
            SELECT * FROM json_to_recordset(:tracks) AS t(id varchar, name text, artist_name text, album_name text, duration_ms integer, image_url text)
            ON CONFLICT (id) DO UPDATE SET
                duration_ms = COALESCE(track.duration_ms, EXCLUDED.duration_ms),
                image_url = COALESCE(EXCLUDED.image_url, track.image_url)
            WHERE track.duration_ms IS NULL OR track.image_url IS DISTINCT FROM COALESCE(EXCLUDED.image_url, track.image_url)
            SQL, ['tracks' => json_encode(array_values($tracks), \JSON_THROW_ON_ERROR)]);
    }
}
