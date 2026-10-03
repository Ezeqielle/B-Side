<?php

namespace App\Deezer;

use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Appels à l'API publique Deezer, sans authentification.
 */
class DeezerApi
{
    /** Deezer répond 200 même en erreur : ce code-là veut dire « introuvable ». */
    private const int NO_DATA = 800;

    public function __construct(
        #[Target('deezer.client')]
        private readonly HttpClientInterface $deezerClient,
    ) {
    }

    public function findTrackByIsrc(string $isrc): ?DeezerTrack
    {
        $data = $this->get('track/isrc:' . rawurlencode($isrc));

        return null === $data ? null : DeezerTrack::fromApi($data);
    }

    /**
     * Recherche simple, en secours de l'ISRC : un même titre en a souvent un par sortie (single, album).
     * La recherche avancée (`artist:"…" track:"…"`) ne renvoie plus rien.
     * Seul un résultat au titre et à l'artiste identiques est retenu, pour écarter reprises et remix.
     *
     * @param list<string> $artists
     */
    public function searchTrack(string $title, array $artists): ?DeezerTrack
    {
        if ([] === $artists) {
            return null;
        }

        $artists = array_map(mb_strtolower(...), $artists);
        $data = $this->get('search', ['q' => $artists[0] . ' ' . $title, 'limit' => 10]);

        foreach ($data['data'] ?? [] as $item) {
            if (mb_strtolower($item['title']) === mb_strtolower($title)
                && \in_array(mb_strtolower($item['artist']['name']), $artists, true)) {
                return DeezerTrack::fromApi($item);
            }
        }

        return null;
    }

    public function getTrack(int $id): ?DeezerTrack
    {
        $data = $this->get('track/' . $id);

        return null === $data ? null : DeezerTrack::fromApi($data);
    }

    /**
     * @param array<string, scalar> $query
     *
     * @return array<string, mixed>|null null si Deezer n'a rien
     */
    private function get(string $path, array $query = []): ?array
    {
        $data = $this->deezerClient->request('GET', $path, ['query' => $query])->toArray();

        if (isset($data['error'])) {
            if (self::NO_DATA === ($data['error']['code'] ?? null)) {
                return null;
            }

            throw new DeezerException($data['error']['message'] ?? 'Erreur Deezer');
        }

        return $data;
    }
}
