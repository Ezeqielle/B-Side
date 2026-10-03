<?php

namespace App\Spotify\Model;

final readonly class Track
{
    /**
     * @param list<string> $artists
     * @param list<string> $artistIds dans le même ordre que $artists
     */
    public function __construct(
        public string $id,
        public string $uri,
        public string $name,
        public array $artists,
        public array $artistIds,
        public string $album,
        public ?string $imageUrl,
        public int $durationMs,
        public ?string $isrc,
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
            imageUrl: $data['album']['images'][0]['url'] ?? null,
            durationMs: $data['duration_ms'],
            isrc: $data['external_ids']['isrc'] ?? null,
        );
    }
}
