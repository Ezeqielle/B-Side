<?php

namespace App\Repository;

use App\Entity\Track;
use App\History\StreamedPlay;
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
}
