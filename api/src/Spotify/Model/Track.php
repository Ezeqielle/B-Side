<?php

namespace App\Spotify\Model;

final readonly class Track
{
    /** Largeur minimale d'une vignette : assez pour le podium, dix fois plus légère que la grande pochette. */
    private const int THUMBNAIL_WIDTH = 300;

    /**
     * @param list<string> $artists
     * @param list<string> $artistIds   dans le même ordre que $artists
     * @param string       $albumArtist artiste principal de l'album, celui que retient l'historique d'écoute
     */
    public function __construct(
        public string $id,
        public string $uri,
        public string $name,
        public array $artists,
        public array $artistIds,
        public string $album,
        public string $albumArtist,
        public ?string $imageUrl,
        /** Pochette en 300 px, pour les vignettes. */
        public ?string $thumbnailUrl,
        public int $durationMs,
        public ?string $isrc,
        /** `album`, `single` ou `compilation`. */
        public ?string $albumType = null,
        public ?int $albumTracks = null,
    ) {
    }

    /**
     * @param array<string, mixed> $data objet "track" de l'API Spotify
     */
    public static function fromApi(array $data): self
    {
        return new self(
            id: $data['id'],
            uri: $data['uri'],
            name: $data['name'],
            artists: array_column($data['artists'], 'name'),
            artistIds: array_column($data['artists'], 'id'),
            album: $data['album']['name'],
            albumArtist: $data['album']['artists'][0]['name'] ?? $data['artists'][0]['name'] ?? '',
            imageUrl: $data['album']['images'][0]['url'] ?? null,
            thumbnailUrl: self::thumbnail($data['album']['images'] ?? []),
            durationMs: $data['duration_ms'],
            isrc: $data['external_ids']['isrc'] ?? null,
            albumType: $data['album']['album_type'] ?? null,
            albumTracks: $data['album']['total_tracks'] ?? null,
        );
    }

    /**
     * Plus petite pochette d'au moins THUMBNAIL_WIDTH px, sinon la plus grande.
     *
     * @param list<array{url: string, width?: ?int}> $images de la plus grande à la plus petite
     */
    private static function thumbnail(array $images): ?string
    {
        $url = $images[0]['url'] ?? null;
        $best = \PHP_INT_MAX;
        foreach ($images as $image) {
            $width = $image['width'] ?? 0;
            if ($width >= self::THUMBNAIL_WIDTH && $width < $best) {
                [$url, $best] = [$image['url'], $width];
            }
        }

        return $url;
    }
}
